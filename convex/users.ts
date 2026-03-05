import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Upsert a user on first sign-in via Clerk.
 * If the user is new, creates a personal workspace for them.
 * Called from the app shell on every authenticated load.
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { clerkId, email, name }) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      // Update name/email in case they changed in Clerk
      await ctx.db.patch(existing._id, { email, name });
      return { userId: existing._id, workspaceId: existing.workspaceId };
    }

    // New user — create a default workspace
    const today = new Date().toISOString().slice(0, 10);
    const workspaceId = await ctx.db.insert("workspaces", {
      name: `${name}'s Workspace`,
      ownerId: clerkId,
      jiraConnected: false,
      plan: "free",
      aiActionsToday: 0,
      lastResetDate: today,
    });

    // Insert the user record
    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      workspaceId,
      role: "owner",
    });

    return { userId, workspaceId };
  },
});

/**
 * Get the current user + their workspace by Clerk ID.
 * Used throughout the app to load the active workspace.
 */
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) return null;

    const workspace = user.workspaceId
      ? await ctx.db.get(user.workspaceId)
      : null;

    return { user, workspace };
  },
});
