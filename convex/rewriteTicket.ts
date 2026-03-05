"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { callClaude, SONNET } from "./lib/callClaude";
import { Id } from "./_generated/dataModel";

// ─── Output type (also used by the UI) ──────────────────────────────────────

export interface RewriteOutput {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  estimatePoints: number;
  confidence: "high" | "medium" | "low";
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert product manager and technical writer specialising in agile ticket writing.
Your task is to rewrite Jira tickets into well-structured, unambiguous engineering tasks.

OUTPUT FORMAT — respond with ONLY valid JSON matching this exact schema:
{
  "title": "Clear, action-oriented title starting with a verb",
  "description": "User story or technical context. 2–4 sentences. Include WHY, not just WHAT.",
  "acceptanceCriteria": [
    "Criteria 1 — specific, testable, starts with a verb",
    "Criteria 2",
    "Criteria 3"
  ],
  "estimatePoints": <integer — Fibonacci: 1, 2, 3, 5, 8, 13>,
  "confidence": "<high|medium|low> — high if the original had enough context, low if you had to make assumptions"
}

RULES:
- Never invent requirements not implied by the original
- estimatePoints reflects complexity, not time
- confidence = low if the original description was fewer than 50 characters
- Return ONLY the JSON object. No markdown fences, no preamble.`;

// ─── Action ─────────────────────────────────────────────────────────────────

/**
 * Rewrite a single ticket using Claude Sonnet.
 *
 * Flow:
 *   1. Check aiOutputCache (24hr TTL per ticket per day)
 *   2. Call callClaude (handles usage gate, job logging, streaming)
 *   3. Parse and validate the JSON response
 *   4. Write result to cache
 *   5. Return jobId so the client can subscribe for streaming updates
 */
export const rewriteTicket = action({
  args: {
    ticketId: v.id("tickets"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { ticketId, workspaceId }) => {
    // ── 1. Load ticket ────────────────────────────────────────────────────
    const ticket = await ctx.runQuery(api.tickets.getById, { ticketId });
    if (!ticket) throw new Error("Ticket not found");

    // ── 2. Check 24hr cache ───────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `rewrite:${ticketId}:${today}`;
    const cached = await ctx.runQuery(api.cache.readCache, { cacheKey });

    if (cached) {
      // Return the cached job-like structure so the UI can render immediately
      // Create a new "complete" job pointing at the cached output
      const cachedJobId = await ctx.runMutation(api.aiJobs.createJob, {
        workspaceId,
        type: "rewrite_ticket",
        input: JSON.stringify({ ticketId, cached: true }),
      }) as Id<"aiJobs">;

      await ctx.runMutation(api.aiJobs.setJobComplete, {
        jobId: cachedJobId,
        output: cached.output,
        modelUsed: `${SONNET} (cached)`,
        tokensUsed: 0,
        cachedTokens: 0,
      });

      return { jobId: cachedJobId, fromCache: true };
    }

    // ── 3. Build user message ─────────────────────────────────────────────
    const userMessage = buildUserMessage(ticket);

    // ── 4. Call Claude (Sonnet, streaming) ────────────────────────────────
    const { jobId, output } = await callClaude(ctx, {
      workspaceId,
      model: "sonnet",
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      jobType: "rewrite_ticket",
      jobInput: JSON.stringify({ ticketId, title: ticket.title }),
    });

    // ── 5. Parse + validate JSON ──────────────────────────────────────────
    let parsed: RewriteOutput;
    try {
      parsed = JSON.parse(output.trim()) as RewriteOutput;
      // Basic validation
      if (!parsed.title || !parsed.description || !Array.isArray(parsed.acceptanceCriteria)) {
        throw new Error("Missing required fields");
      }
      if (!["high", "medium", "low"].includes(parsed.confidence)) {
        parsed.confidence = "medium";
      }
    } catch {
      // If parsing fails, build a graceful fallback
      parsed = {
        title: ticket.title,
        description: output.slice(0, 500),
        acceptanceCriteria: [],
        estimatePoints: ticket.estimate ?? 3,
        confidence: "low",
      };
    }

    const finalOutput = JSON.stringify(parsed);

    // Update the job with the final parsed output
    await ctx.runMutation(api.aiJobs.setJobComplete, {
      jobId,
      output: finalOutput,
      modelUsed: SONNET,
      tokensUsed: 0,
      cachedTokens: 0,
    });

    // ── 6. Cache result (24hr TTL) ────────────────────────────────────────
    await ctx.runMutation(api.cache.writeCache, {
      cacheKey,
      output: finalOutput,
      ttlMs: 24 * 60 * 60 * 1000,
    });

    return { jobId, fromCache: false };
  },
});

// ─── Accept a rewrite — patches the ticket in Convex ─────────────────────────

export const acceptRewrite = action({
  args: {
    ticketId: v.id("tickets"),
    rewrite: v.object({
      title: v.string(),
      description: v.string(),
      acceptanceCriteria: v.array(v.string()),
      estimatePoints: v.number(),
      confidence: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
    }),
  },
  handler: async (ctx, { ticketId, rewrite }) => {
    // Build the new description including acceptance criteria
    const fullDescription = [
      rewrite.description,
      "",
      "**Acceptance Criteria:**",
      ...rewrite.acceptanceCriteria.map((c) => `- ${c}`),
    ].join("\n");

    await ctx.runMutation(api.tickets.patchTicket, {
      ticketId,
      title: rewrite.title,
      description: fullDescription,
      estimate: rewrite.estimatePoints,
    });

    return { success: true };
  },
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildUserMessage(ticket: {
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  priority?: string;
  estimate?: number;
  jiraId?: string;
}): string {
  const lines = [
    `TICKET: ${ticket.jiraId ?? "N/A"}`,
    `TITLE: ${ticket.title}`,
    `STATUS: ${ticket.status}`,
    ticket.assignee ? `ASSIGNEE: ${ticket.assignee}` : "ASSIGNEE: Unassigned",
    ticket.priority ? `PRIORITY: ${ticket.priority}` : "",
    ticket.estimate ? `CURRENT ESTIMATE: ${ticket.estimate} points` : "CURRENT ESTIMATE: Not estimated",
    "",
    "CURRENT DESCRIPTION:",
    ticket.description?.trim() || "(no description)",
  ];

  return lines.filter((l) => l !== undefined).join("\n");
}
