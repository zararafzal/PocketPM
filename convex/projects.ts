import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all projects for a workspace, ordered by name.
 */
export const getByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

/**
 * Get a single project by ID.
 */
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db.get(projectId);
  },
});

/**
 * Upsert a project — creates or updates based on jiraProjectKey.
 * Called from Jira sync actions.
 */
export const upsertProject = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    jiraProjectKey: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { workspaceId, jiraProjectKey, name }) => {
    // Check if project exists
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const existing = projects.find((p) => p.jiraProjectKey === jiraProjectKey);

    if (existing) {
      await ctx.db.patch(existing._id, { name });
      return existing._id;
    }

    return ctx.db.insert("projects", {
      workspaceId,
      jiraProjectKey,
      name,
      ticketCount: 0,
      healthScore: 0,
    });
  },
});

/**
 * Update project stats after a sync.
 */
export const updateStats = mutation({
  args: {
    projectId: v.id("projects"),
    ticketCount: v.number(),
    healthScore: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, ticketCount, healthScore }) => {
    await ctx.db.patch(projectId, {
      ticketCount,
      healthScore: healthScore ?? 0,
      lastSyncedAt: Date.now(),
    });
  },
});
