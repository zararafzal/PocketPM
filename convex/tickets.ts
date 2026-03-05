import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { scoreTicket } from "./lib/healthScorer";

/**
 * Get all tickets for a project.
 */
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  },
});

/**
 * Get a single ticket by ID.
 */
export const getById = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    return ctx.db.get(ticketId);
  },
});

/**
 * Upsert a ticket from Jira sync data.
 * Scores the ticket inline — aiHealthScore and aiHealthLabel are always written.
 */
export const upsertTicket = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    jiraId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    assignee: v.optional(v.string()),
    priority: v.optional(v.string()),
    estimate: v.optional(v.number()),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    // Score the ticket using rule-based scorer
    const { score, label } = scoreTicket({
      description: args.description,
      assignee: args.assignee,
      estimate: args.estimate,
    });

    const ticketData = {
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      jiraId: args.jiraId,
      title: args.title,
      description: args.description,
      status: args.status,
      assignee: args.assignee,
      priority: args.priority,
      estimate: args.estimate,
      lastUpdated: args.lastUpdated,
      aiHealthScore: score,
      aiHealthLabel: label,
    };

    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_jira_id", (q) => q.eq("jiraId", args.jiraId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, ticketData);
      return existing._id;
    }

    return ctx.db.insert("tickets", ticketData);
  },
});

/**
 * Get distinct assignees for a project — used to populate filter dropdown.
 */
export const getAssignees = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const assignees = [
      ...new Set(tickets.map((t) => t.assignee).filter(Boolean)),
    ] as string[];
    return assignees.sort();
  },
});

/**
 * Patch a ticket's core fields after an AI rewrite is accepted.
 */
export const patchTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    estimate: v.optional(v.number()),
  },
  handler: async (ctx, { ticketId, title, description, estimate }) => {
    const patch: Record<string, unknown> = { lastUpdated: Date.now() };
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (estimate !== undefined) patch.estimate = estimate;

    await ctx.db.patch(ticketId, patch);

    // Re-score after patch (description may have changed)
    const updated = await ctx.db.get(ticketId);
    if (updated) {
      const { score, label } = scoreTicket({
        description: updated.description,
        assignee: updated.assignee,
        estimate: updated.estimate,
      });
      await ctx.db.patch(ticketId, { aiHealthScore: score, aiHealthLabel: label });
    }
  },
});

/**
 * Store an embedding vector on a ticket.
 * Called by the embedding action after Voyage AI returns a vector.
 */
export const setEmbedding = mutation({
  args: {
    ticketId: v.id("tickets"),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, { ticketId, embedding }) => {
    await ctx.db.patch(ticketId, { embedding });
  },
});

/**
 * Get tickets with no embedding — used by the background embed cron.
 */
export const getUnembedded = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const tickets = await ctx.db.query("tickets").collect();
    return tickets
      .filter((t) => !t.embedding || t.embedding.length === 0)
      .slice(0, limit);
  },
});

/**
 * Get tickets updated after a given timestamp — used to re-embed stale vectors.
 */
export const getRecentlyUpdated = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { since, limit = 50 }) => {
    const tickets = await ctx.db.query("tickets").collect();
    return tickets
      .filter((t) => t.lastUpdated > since)
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, limit);
  },
});

/**
 * Get the worst-scoring tickets for a project (for the health panel).
 * Returns up to `limit` tickets ordered by aiHealthScore ascending.
 */
export const getWorstTickets = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, limit = 5 }) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    return tickets
      .filter((t) => t.aiHealthScore != null)
      .sort((a, b) => (a.aiHealthScore ?? 0) - (b.aiHealthScore ?? 0))
      .slice(0, limit);
  },
});

/**
 * Get the most recent lastUpdated timestamp for a project's tickets.
 * Used as part of the sprint risk cache key.
 */
export const getMaxLastUpdated = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    if (!tickets.length) return 0;
    return Math.max(...tickets.map((t) => t.lastUpdated));
  },
});
