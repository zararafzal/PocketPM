import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const JOB_TYPES = v.union(
  v.literal("rewrite_ticket"),
  v.literal("sprint_risk"),
  v.literal("status_update"),
  v.literal("embed_ticket")
);

/**
 * Create a new AI job record. Returns the job ID immediately so the client
 * can subscribe before the action starts producing output.
 */
export const createJob = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: JOB_TYPES,
    input: v.string(),
  },
  handler: async (ctx, { workspaceId, type, input }) => {
    return ctx.db.insert("aiJobs", {
      workspaceId,
      type,
      status: "running",
      input,
      createdAt: Date.now(),
    });
  },
});

/**
 * Write a streaming token chunk to the job.
 * Called every ~10 tokens during a Claude stream so the client
 * sees the response building up via reactive query.
 */
export const appendStreamChunk = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    streamBuffer: v.string(), // full accumulated text so far
  },
  handler: async (ctx, { jobId, streamBuffer }) => {
    await ctx.db.patch(jobId, { output: streamBuffer });
  },
});

/**
 * Mark a job complete with final structured output and token metadata.
 */
export const completeJob = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    output: v.string(),         // final JSON string
    modelUsed: v.string(),
    tokensUsed: v.number(),
    cachedTokens: v.number(),
  },
  handler: async (ctx, { jobId, output, modelUsed, tokensUsed, cachedTokens }) => {
    await ctx.db.patch(jobId, {
      status: "complete",
      output,
      modelUsed,
      tokensUsed,
      cachedTokens,
    });
  },
});

/**
 * Public version — callable from actions (not just internal).
 * Used by rewriteTicket to set the final parsed output after streaming.
 */
export const setJobComplete = mutation({
  args: {
    jobId: v.id("aiJobs"),
    output: v.string(),
    modelUsed: v.string(),
    tokensUsed: v.number(),
    cachedTokens: v.number(),
  },
  handler: async (ctx, { jobId, output, modelUsed, tokensUsed, cachedTokens }) => {
    await ctx.db.patch(jobId, {
      status: "complete",
      output,
      modelUsed,
      tokensUsed,
      cachedTokens,
    });
  },
});

/**
 * Mark a job as failed with an error message in the output field.
 */
export const failJob = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, { jobId, error }) => {
    await ctx.db.patch(jobId, {
      status: "failed",
      output: JSON.stringify({ error }),
    });
  },
});

/**
 * Reactive query — the client subscribes to this and sees updates as they stream in.
 */
export const getById = query({
  args: { jobId: v.id("aiJobs") },
  handler: async (ctx, { jobId }) => {
    return ctx.db.get(jobId);
  },
});

/**
 * Get the N most recent jobs for a workspace (for the AI panel log).
 */
export const getRecent = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, limit = 10 }) => {
    const jobs = await ctx.db
      .query("aiJobs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit);
    return jobs;
  },
});
