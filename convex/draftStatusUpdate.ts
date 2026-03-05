"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { callClaude, SONNET } from "./lib/callClaude";
import { Id } from "./_generated/dataModel";

// ─── Output type ─────────────────────────────────────────────────────────────

export interface StatusUpdateOutput {
  progress: string;
  risks: string;
  nextWeek: string;
  slackReady: string;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert product manager writing clear, concise stakeholder status updates.
Write in a professional but accessible tone. Be specific about progress and honest about risks.

OUTPUT FORMAT — respond with ONLY valid JSON matching this exact schema:
{
  "progress": "One paragraph (3-5 sentences) on what was accomplished this period. Reference specific ticket IDs and assignees by name where available.",
  "risks": "One paragraph (2-4 sentences) identifying current risks and blockers. Be honest but not alarmist. If there are no risks, note the sprint is on track.",
  "nextWeek": "One paragraph (2-4 sentences) on planned work next week, including key deliverables and owners.",
  "slackReady": "A plain-text Slack message combining all three sections. Use *Progress*, *Risks*, and *Next Week* as bold headers. No other markdown. Max 280 words total."
}

RULES:
- Reference real ticket IDs (e.g. PROJ-42) and assignee names from the data provided
- Stale or unassigned tickets should appear in the Risks section
- nextWeek should focus on in-progress and upcoming tickets
- Return ONLY the JSON object. No markdown fences, no preamble.`;

// ─── Action ──────────────────────────────────────────────────────────────────

export const draftStatusUpdate = action({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { projectId, workspaceId }) => {
    // ── 1. Check 24hr cache ───────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `status_update:${projectId}:${today}`;
    const cached = await ctx.runQuery(api.cache.readCache, { cacheKey });

    if (cached) {
      const cachedJobId = (await ctx.runMutation(api.aiJobs.createJob, {
        workspaceId,
        type: "status_update",
        input: JSON.stringify({ projectId, cached: true }),
      })) as Id<"aiJobs">;

      await ctx.runMutation(api.aiJobs.setJobComplete, {
        jobId: cachedJobId,
        output: cached.output,
        modelUsed: `${SONNET} (cached)`,
        tokensUsed: 0,
        cachedTokens: 0,
      });

      return { jobId: cachedJobId, fromCache: true };
    }

    // ── 2. Build ticket context ───────────────────────────────────────────
    const [tickets, project] = await Promise.all([
      ctx.runQuery(api.tickets.getByProject, { projectId }),
      ctx.runQuery(api.projects.getById, { projectId }),
    ]);

    const userMessage = buildContextMessage(project, tickets);

    // ── 3. Call Claude Sonnet (streamed) ──────────────────────────────────
    const { jobId, output } = await callClaude(ctx, {
      workspaceId,
      model: "sonnet",
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      jobType: "status_update",
      jobInput: JSON.stringify({ projectId, ticketCount: tickets.length }),
    });

    // ── 4. Parse & validate JSON ──────────────────────────────────────────
    let parsed: StatusUpdateOutput;
    try {
      const clean = output.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      parsed = JSON.parse(clean) as StatusUpdateOutput;
      if (!parsed.progress || !parsed.risks || !parsed.nextWeek || !parsed.slackReady) {
        throw new Error("Missing required fields");
      }
    } catch {
      // Graceful fallback — surface raw text so the PM sees something
      parsed = {
        progress: output.slice(0, 500),
        risks: "Unable to parse structured response.",
        nextWeek: "",
        slackReady: output.slice(0, 600),
      };
    }

    const finalOutput = JSON.stringify(parsed);

    // ── 5. Update job with final parsed output ────────────────────────────
    await ctx.runMutation(api.aiJobs.setJobComplete, {
      jobId,
      output: finalOutput,
      modelUsed: SONNET,
      tokensUsed: 0,
      cachedTokens: 0,
    });

    // ── 6. Cache for 24 hours ─────────────────────────────────────────────
    await ctx.runMutation(api.cache.writeCache, {
      cacheKey,
      output: finalOutput,
      ttlMs: 24 * 60 * 60 * 1000,
    });

    return { jobId, fromCache: false };
  },
});

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContextMessage(
  project: { name: string; jiraProjectKey?: string | null } | null,
  tickets: Array<{
    jiraId?: string;
    title: string;
    status: string;
    assignee?: string;
    priority?: string;
    estimate?: number;
    lastUpdated: number;
    aiHealthLabel?: string;
  }>
): string {
  const now = Date.now();
  const msPerDay = 86400000;

  const lines: string[] = [
    `PROJECT: ${project?.name ?? "Unknown"} (${project?.jiraProjectKey ?? "?"})`,
    `TOTAL TICKETS: ${tickets.length}`,
    `AS OF: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "TICKET DATA BY STATUS:",
  ];

  // Group by status
  const byStatus: Record<string, typeof tickets> = {};
  for (const t of tickets) {
    const s = t.status ?? "Unknown";
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(t);
  }

  for (const [status, group] of Object.entries(byStatus)) {
    lines.push(`\n[${status.toUpperCase()}] — ${group.length} tickets`);
    for (const t of group.slice(0, 10)) {
      const daysAgo = Math.floor((now - t.lastUpdated) / msPerDay);
      const age = daysAgo === 0 ? "today" : `${daysAgo}d ago`;
      lines.push(
        `  ${t.jiraId ?? "??"}: ${t.title}` +
          `  [${t.assignee ?? "unassigned"}]` +
          (t.estimate ? ` ${t.estimate}pts` : "") +
          `  — updated ${age}`
      );
    }
    if (group.length > 10) lines.push(`  … and ${group.length - 10} more`);
  }

  // Highlight stale tickets (5+ days, not done)
  const doneKeywords = ["done", "closed", "resolved", "complete", "released"];
  const stale = tickets.filter(
    (t) =>
      now - t.lastUpdated > 5 * msPerDay &&
      !doneKeywords.some((k) => t.status.toLowerCase().includes(k))
  );
  if (stale.length > 0) {
    lines.push(`\nATTENTION — STALE TICKETS (no update in 5+ days):`);
    stale.slice(0, 8).forEach((t) => {
      const days = Math.floor((now - t.lastUpdated) / msPerDay);
      lines.push(`  ${t.jiraId ?? "??"}: ${t.title} [${t.status}] — ${days}d stale`);
    });
  }

  return lines.join("\n");
}
