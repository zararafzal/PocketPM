"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { createDecipheriv } from "crypto";
import { Id } from "./_generated/dataModel";
// cache module imported via api.cache.*

// ─── Encryption helpers (mirror of lib/encryption.ts, runs in Convex Node runtime) ──

function decryptToken(encryptedStr: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY not set in Convex environment");
  if (key.length !== 64) throw new Error("ENCRYPTION_KEY must be 64 hex chars");

  const keyBuf = Buffer.from(key, "hex");
  const [ivHex, authTagHex, ciphertextHex] = encryptedStr.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex)
    throw new Error("Invalid encrypted token format");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ─── Jira API helpers ────────────────────────────────────────────────────────

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: {
      content?: Array<{
        content?: Array<{ text?: string; type: string }>;
        type: string;
      }>;
      type?: string;
    } | string | null;
    status: { name: string };
    assignee?: { displayName: string } | null;
    priority?: { name: string } | null;
    story_points?: number | null;
    customfield_10016?: number | null; // Story points (most common field)
    customfield_10028?: number | null; // Story points (some configs)
    updated: string;
  };
}

function extractDescriptionText(
  description: JiraIssue["fields"]["description"]
): string | undefined {
  if (!description) return undefined;
  // Plain string (older Jira versions)
  if (typeof description === "string") return description;
  // Atlassian Document Format (ADF)
  if (description.content) {
    const texts: string[] = [];
    for (const block of description.content) {
      if (block.content) {
        for (const inline of block.content) {
          if (inline.type === "text" && inline.text) {
            texts.push(inline.text);
          }
        }
      }
    }
    return texts.join(" ").trim() || undefined;
  }
  return undefined;
}

function extractStoryPoints(fields: JiraIssue["fields"]): number | undefined {
  const sp =
    fields.customfield_10016 ??
    fields.customfield_10028 ??
    fields.story_points;
  return sp != null ? sp : undefined;
}

async function fetchAllJiraIssues(
  cloudId: string,
  projectKey: string,
  accessToken: string
): Promise<JiraIssue[]> {
  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
  const maxResults = 100;
  let startAt = 0;
  const allIssues: JiraIssue[] = [];

  while (true) {
    const jql = encodeURIComponent(`project = "${projectKey}" ORDER BY updated DESC`);
    const fields =
      "summary,description,status,assignee,priority,customfield_10016,customfield_10028,updated";
    const url = `${baseUrl}/search?jql=${jql}&maxResults=${maxResults}&startAt=${startAt}&fields=${fields}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira issues fetch failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    allIssues.push(...data.issues);

    // Check if we've fetched everything
    if (startAt + data.issues.length >= data.total || data.issues.length === 0) {
      break;
    }
    startAt += maxResults;
  }

  return allIssues;
}

// ─── Public actions ──────────────────────────────────────────────────────────

/**
 * Sync all Jira projects for the authenticated user's workspace.
 * Called after OAuth connection and from the dashboard "Sync" button.
 */
export const syncJiraProjects = action({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    // Get workspace + credentials
    const workspace = await ctx.runQuery(api.workspaces.getWorkspaceByClerkId, {
      clerkId,
    });
    if (!workspace?.jiraConnected || !workspace.jiraSiteUrl || !workspace.jiraAccessToken) {
      throw new Error("Workspace not connected to Jira");
    }

    const [cloudId] = workspace.jiraSiteUrl.split("|");
    const accessToken = decryptToken(workspace.jiraAccessToken);

    // Fetch all Jira projects
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira projects fetch failed (${res.status}): ${err}`);
    }

    const jiraProjects: JiraProject[] = await res.json();

    // Upsert each project into Convex
    const projectIds: Id<"projects">[] = [];
    for (const jp of jiraProjects) {
      const projectId = await ctx.runMutation(api.projects.upsertProject, {
        workspaceId: workspace._id,
        jiraProjectKey: jp.key,
        name: jp.name,
      });
      projectIds.push(projectId as Id<"projects">);
    }

    // Sync tickets for each project
    for (let i = 0; i < jiraProjects.length; i++) {
      const projectId = projectIds[i];
      const projectKey = jiraProjects[i].key;
      try {
        await ctx.runAction(api.jira.syncJiraTickets, {
          projectId,
          clerkId,
        });
      } catch (e) {
        console.error(`Failed to sync tickets for ${projectKey}:`, e);
        // Continue with other projects even if one fails
      }
    }

    return { projectCount: jiraProjects.length };
  },
});

/**
 * Sync all tickets for a single project.
 * Called from "Sync Now" button and the 15-minute cron.
 */
export const syncJiraTickets = action({
  args: {
    projectId: v.id("projects"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, clerkId: _clerkId }): Promise<{ ticketCount: number; healthScore: number }> => {
    // Get project details
    const project = await ctx.runQuery(api.projects.getById, { projectId });
    if (!project?.jiraProjectKey) throw new Error("Project not found or missing Jira key");

    // Get workspace credentials
    const workspace = await ctx.runQuery(api.workspaces.getWorkspace, {
      workspaceId: project.workspaceId,
    });
    if (!workspace?.jiraConnected || !workspace.jiraSiteUrl || !workspace.jiraAccessToken) {
      throw new Error("Workspace not connected to Jira");
    }

    const [cloudId] = workspace.jiraSiteUrl.split("|");
    const accessToken = decryptToken(workspace.jiraAccessToken);

    // Fetch all issues for this project with pagination
    const issues = await fetchAllJiraIssues(
      cloudId,
      project.jiraProjectKey,
      accessToken
    );

    // Upsert each ticket
    for (const issue of issues) {
      const description = extractDescriptionText(issue.fields.description);
      const estimate = extractStoryPoints(issue.fields);

      await ctx.runMutation(api.tickets.upsertTicket, {
        workspaceId: project.workspaceId,
        projectId,
        jiraId: issue.key,
        title: issue.fields.summary,
        description,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName ?? undefined,
        priority: issue.fields.priority?.name ?? undefined,
        estimate,
        lastUpdated: new Date(issue.fields.updated).getTime(),
      });
    }

    // ── Compute project-level health score ──────────────────────────────────
    // Re-query tickets after upsert so aiHealthScore values are fresh
    const scoredTickets = await ctx.runQuery(api.tickets.getByProject, {
      projectId,
    });
    const scores = scoredTickets
      .map((t) => t.aiHealthScore)
      .filter((s): s is number => s != null);
    const avgHealth =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;

    // Breakdown counts for cache
    const breakdown = {
      complete: scoredTickets.filter((t) => t.aiHealthLabel === "complete").length,
      needs_work: scoredTickets.filter((t) => t.aiHealthLabel === "needs_work").length,
      broken: scoredTickets.filter((t) => t.aiHealthLabel === "broken").length,
    };

    // Update project stats with real health score
    await ctx.runMutation(api.projects.updateStats, {
      projectId,
      ticketCount: issues.length,
      healthScore: avgHealth,
    });

    // Write board health to cache with 1-hour TTL (ready for AI upgrade in Iteration 4)
    await ctx.runMutation(api.cache.writeCache, {
      cacheKey: `board_health:${projectId}`,
      output: JSON.stringify({
        healthScore: avgHealth,
        ticketCount: issues.length,
        breakdown,
        scoredAt: Date.now(),
      }),
      ttlMs: 60 * 60 * 1000, // 1 hour
    });

    return { ticketCount: issues.length, healthScore: avgHealth };
  },
});

/**
 * Internal action called by the 15-minute cron.
 * Syncs ALL tickets across ALL connected workspaces.
 */
export const syncAllConnectedProjects = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all connected workspaces
    const workspaces = await ctx.runQuery(api.workspaces.getAllConnected, {});

    let totalSynced = 0;
    for (const workspace of workspaces) {
      // Get all projects for this workspace
      const projects = await ctx.runQuery(api.projects.getByWorkspace, {
        workspaceId: workspace._id,
      });

      for (const project of projects) {
        try {
          const result = await ctx.runAction(api.jira.syncJiraTickets, {
            projectId: project._id,
          });
          totalSynced += result.ticketCount;
        } catch (e) {
          console.error(
            `Cron sync failed for project ${project.jiraProjectKey}:`,
            e
          );
        }
      }
    }

    console.log(`Cron sync complete. Total tickets synced: ${totalSynced}`);
  },
});
