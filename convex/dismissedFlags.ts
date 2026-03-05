import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Per-flag dismiss state is stored in the aiOutputCache table using
 * a stable key per workspace+project. This avoids schema changes while
 * providing real persistence across sessions.
 *
 * cacheKey format: "dismissed_flags:{workspaceId}:{projectId}"
 * value: JSON array of dismissed flag IDs, e.g. ["unestimated_001", "stale_001"]
 */

function makeKey(workspaceId: string, projectId: string): string {
  return `dismissed_flags:${workspaceId}:${projectId}`;
}

/**
 * Return the list of dismissed flag IDs for a project.
 */
export const getDismissed = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { workspaceId, projectId }) => {
    const cacheKey = makeKey(workspaceId, projectId);
    const entry = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    if (!entry) return [] as string[];
    try {
      return JSON.parse(entry.output) as string[];
    } catch {
      return [] as string[];
    }
  },
});

/**
 * Dismiss a flag by ID. Idempotent — safe to call multiple times.
 */
export const dismissFlag = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    flagId: v.string(),
  },
  handler: async (ctx, { workspaceId, projectId, flagId }) => {
    const cacheKey = makeKey(workspaceId, projectId);
    const existing = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    const current: string[] = existing
      ? (() => {
          try {
            return JSON.parse(existing.output) as string[];
          } catch {
            return [];
          }
        })()
      : [];

    if (!current.includes(flagId)) {
      current.push(flagId);
    }
    const output = JSON.stringify(current);

    if (existing) {
      await ctx.db.patch(existing._id, { output, createdAt: Date.now() });
    } else {
      await ctx.db.insert("aiOutputCache", {
        cacheKey,
        output,
        createdAt: Date.now(),
        expiresAt: 0, // never expires
      });
    }
  },
});

/**
 * Restore a previously dismissed flag. Idempotent.
 */
export const restoreFlag = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    flagId: v.string(),
  },
  handler: async (ctx, { workspaceId, projectId, flagId }) => {
    const cacheKey = makeKey(workspaceId, projectId);
    const existing = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    if (!existing) return;

    let current: string[] = [];
    try {
      current = JSON.parse(existing.output) as string[];
    } catch {
      return;
    }

    const updated = current.filter((id) => id !== flagId);
    await ctx.db.patch(existing._id, { output: JSON.stringify(updated) });
  },
});

/**
 * Clear all dismissed flags for a project (e.g. after a new risk analysis).
 */
export const clearAllDismissed = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { workspaceId, projectId }) => {
    const cacheKey = makeKey(workspaceId, projectId);
    const existing = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { output: "[]" });
    }
  },
});
