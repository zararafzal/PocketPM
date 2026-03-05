import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Workspaces ────────────────────────────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(), // Clerk user ID
    jiraConnected: v.boolean(),
    jiraSiteUrl: v.optional(v.string()),
    jiraAccessToken: v.optional(v.string()), // encrypted in Iteration 2
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    aiActionsToday: v.number(),
    lastResetDate: v.string(), // ISO date string YYYY-MM-DD
  }).index("by_owner", ["ownerId"]),

  // ─── Projects ──────────────────────────────────────────────────────────────
  projects: defineTable({
    workspaceId: v.id("workspaces"),
    jiraProjectKey: v.optional(v.string()),
    name: v.string(),
    ticketCount: v.number(),
    healthScore: v.number(), // 0–100
    lastSyncedAt: v.optional(v.number()), // Unix timestamp
  }).index("by_workspace", ["workspaceId"]),

  // ─── Tickets ───────────────────────────────────────────────────────────────
  tickets: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    jiraId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    assignee: v.optional(v.string()),
    priority: v.optional(v.string()),
    estimate: v.optional(v.number()),
    embedding: v.optional(v.array(v.number())),
    aiHealthScore: v.optional(v.number()),
    aiHealthLabel: v.optional(
      v.union(
        v.literal("complete"),
        v.literal("needs_work"),
        v.literal("broken")
      )
    ),
    lastUpdated: v.number(), // Unix timestamp
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_jira_id", ["jiraId"]),

  // ─── AI Jobs ───────────────────────────────────────────────────────────────
  aiJobs: defineTable({
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("rewrite_ticket"),
      v.literal("sprint_risk"),
      v.literal("status_update"),
      v.literal("embed_ticket")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    input: v.string(), // JSON string
    output: v.optional(v.string()), // JSON string
    modelUsed: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_status", ["status"]),

  // ─── AI Output Cache ───────────────────────────────────────────────────────
  aiOutputCache: defineTable({
    cacheKey: v.string(), // deterministic key e.g. "sprint_risk:projectId:maxLastUpdated"
    output: v.string(), // JSON string
    createdAt: v.number(),
    expiresAt: v.number(), // Unix timestamp — 0 = no expiry
  }).index("by_cache_key", ["cacheKey"]),

  // ─── AI Usage ──────────────────────────────────────────────────────────────
  aiUsage: defineTable({
    workspaceId: v.id("workspaces"),
    date: v.string(), // YYYY-MM-DD
    actionCount: v.number(),
  })
    .index("by_workspace_date", ["workspaceId", "date"]),

  // ─── Users ─────────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_workspace", ["workspaceId"]),
});
