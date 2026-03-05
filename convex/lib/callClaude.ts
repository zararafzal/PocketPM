import Anthropic from "@anthropic-ai/sdk";
import { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ─── Model constants ────────────────────────────────────────────────────────

export const HAIKU = "claude-haiku-4-5-20251001";
export const SONNET = "claude-sonnet-4-20250514";

type ModelAlias = "haiku" | "sonnet";

function resolveModel(alias: ModelAlias): string {
  return alias === "haiku" ? HAIKU : SONNET;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobType =
  | "rewrite_ticket"
  | "sprint_risk"
  | "status_update"
  | "embed_ticket";

export interface CallClaudeOptions {
  workspaceId: Id<"workspaces">;
  model: ModelAlias;
  systemPrompt: string;
  userMessage: string;
  jobType: JobType;
  jobInput: string;
  /** If provided, streamed text goes here token-by-token during action execution */
  onStreamText?: (accumulatedText: string) => void;
}

export interface CallClaudeResult {
  jobId: Id<"aiJobs">;
  output: string;        // full response text
  tokensUsed: number;
  cachedTokens: number;
}

// ─── Main wrapper ────────────────────────────────────────────────────────────

/**
 * Shared Claude API wrapper used by all AI actions.
 *
 * Responsibilities:
 *   1. Check daily usage cap (throws UsageLimitError if exceeded)
 *   2. Create an aiJobs record and return its ID immediately
 *   3. Call the Anthropic API with cache_control: ephemeral on the system prompt
 *   4. Stream tokens back, writing to the job every TOKEN_BATCH_SIZE tokens
 *   5. Mark the job complete with token counts
 *   6. Return full output + metadata
 */
export async function callClaude(
  ctx: ActionCtx,
  opts: CallClaudeOptions
): Promise<CallClaudeResult> {
  const { workspaceId, model, systemPrompt, userMessage, jobType, jobInput } = opts;

  // ── 1. Usage gate ────────────────────────────────────────────────────────
  await ctx.runMutation(api.aiUsage.checkAndIncrement, { workspaceId });

  // ── 2. Create job record ─────────────────────────────────────────────────
  const jobId = await ctx.runMutation(api.aiJobs.createJob, {
    workspaceId,
    type: jobType,
    input: jobInput,
  }) as Id<"aiJobs">;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelId = resolveModel(model);

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let chunkBuffer = 0;
  const TOKEN_BATCH_SIZE = 15; // write to Convex every N tokens

  try {
    // ── 3. Stream from Claude ─────────────────────────────────────────────
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 2048,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          // @ts-ignore — cache_control is valid in the API but SDK types lag
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        chunkBuffer++;

        opts.onStreamText?.(fullText);

        // Write to Convex in batches to avoid mutation rate limits
        if (chunkBuffer >= TOKEN_BATCH_SIZE) {
          await ctx.runMutation(internal.aiJobs.appendStreamChunk, {
            jobId,
            streamBuffer: fullText,
          });
          chunkBuffer = 0;
        }
      }

      // Capture token usage from the final message event
      if (event.type === "message_delta" && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === "message_start" && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
        cacheReadTokens =
          (event.message.usage as { cache_read_input_tokens?: number })
            .cache_read_input_tokens ?? 0;
        cacheWriteTokens =
          (event.message.usage as { cache_creation_input_tokens?: number })
            .cache_creation_input_tokens ?? 0;
      }
    }

    // Flush any remaining buffered text
    if (chunkBuffer > 0) {
      await ctx.runMutation(internal.aiJobs.appendStreamChunk, {
        jobId,
        streamBuffer: fullText,
      });
    }

    const tokensUsed = inputTokens + outputTokens;
    const cachedTokens = cacheReadTokens + cacheWriteTokens;

    // ── 4. Mark complete ──────────────────────────────────────────────────
    await ctx.runMutation(internal.aiJobs.completeJob, {
      jobId,
      output: fullText,
      modelUsed: modelId,
      tokensUsed,
      cachedTokens,
    });

    return { jobId, output: fullText, tokensUsed, cachedTokens };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.aiJobs.failJob, { jobId, error: message });
    throw err;
  }
}
