import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Store the Jira OAuth connection details after successful OAuth flow.
 * Called from the Next.js /api/jira/callback route.
 */
export const updateJiraConnection = mutation({
  args: {
    clerkId: v.string(),
    cloudId: v.string(),
    siteUrl: v.string(),
    encryptedToken: v.string(),
  },
  handler: async (ctx, { clerkId, cloudId, siteUrl, encryptedToken }) => {
    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user?.workspaceId) throw new Error("User or workspace not found");

    await ctx.db.patch(user.workspaceId, {
      jiraConnected: true,
      jiraSiteUrl: siteUrl,
      // Store cloudId in siteUrl field as "cloudId|siteUrl" for easy parsing
      // We use a pipe separator since URLs contain slashes
      jiraAccessToken: encryptedToken,
    });

    // Also patch siteUrl to store cloudId embedded: "cloudId|siteUrl"
    await ctx.db.patch(user.workspaceId, {
      jiraSiteUrl: `${cloudId}|${siteUrl}`,
    });

    return { workspaceId: user.workspaceId };
  },
});

/**
 * Get the workspace for a given Clerk user ID.
 */
export const getWorkspaceByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user?.workspaceId) return null;
    return ctx.db.get(user.workspaceId);
  },
});

/**
 * Get a workspace by its ID.
 */
export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return ctx.db.get(workspaceId);
  },
});

/**
 * Get all connected workspaces — used by the cron sync job.
 * Internal use only.
 */
export const getAllConnected = query({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    return workspaces.filter((w) => w.jiraConnected);
  },
});
