import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const DAILY_CAP = 20;

/**
 * Get today's usage record for a workspace.
 */
export const getTodayUsage = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const today = new Date().toISOString().slice(0, 10);
    const record = await ctx.db
      .query("aiUsage")
      .withIndex("by_workspace_date", (q) =>
        q.eq("workspaceId", workspaceId).eq("date", today)
      )
      .unique();
    return {
      actionCount: record?.actionCount ?? 0,
      remaining: DAILY_CAP - (record?.actionCount ?? 0),
      cap: DAILY_CAP,
    };
  },
});

/**
 * Check the daily cap and increment the counter atomically.
 * Throws a descriptive error if the cap is reached — caught by the caller.
 *
 * Returns the new action count.
 */
export const checkAndIncrement = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const today = new Date().toISOString().slice(0, 10);

    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_workspace_date", (q) =>
        q.eq("workspaceId", workspaceId).eq("date", today)
      )
      .unique();

    const currentCount = existing?.actionCount ?? 0;

    if (currentCount >= DAILY_CAP) {
      throw new Error(
        `USAGE_LIMIT_EXCEEDED: Daily AI action limit of ${DAILY_CAP} reached. Resets at midnight UTC.`
      );
    }

    const newCount = currentCount + 1;

    if (existing) {
      await ctx.db.patch(existing._id, { actionCount: newCount });
    } else {
      await ctx.db.insert("aiUsage", {
        workspaceId,
        date: today,
        actionCount: newCount,
      });
    }

    // Also patch the workspace's aiActionsToday field for the dashboard stat
    await ctx.db.patch(workspaceId, { aiActionsToday: newCount });

    return { actionCount: newCount, remaining: DAILY_CAP - newCount };
  },
});

/**
 * Internal mutation — called by the midnight UTC cron to reset all counters.
 * Resets the workspace.aiActionsToday field; the aiUsage table starts fresh
 * automatically since we key by date.
 */
export const resetAllDailyCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    for (const ws of workspaces) {
      await ctx.db.patch(ws._id, { aiActionsToday: 0 });
    }
    console.log(`Reset daily AI counters for ${workspaces.length} workspaces`);
  },
});
