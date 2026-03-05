"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const VOYAGE_MODEL = "voyage-3-lite"; // 512 dims, fast, cost-effective
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

/**
 * Generate an embedding vector for a single piece of text via Voyage AI.
 * Returns null if VOYAGE_API_KEY is not set (graceful no-op).
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.log("VOYAGE_API_KEY not set — skipping embedding");
    return null;
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text.slice(0, 4000)], // Voyage has a token limit
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Voyage embedding error (${res.status}): ${err}`);
    return null;
  }

  const data = await res.json();
  return data.data?.[0]?.embedding ?? null;
}

/**
 * Build the text to embed for a ticket.
 * Combines title + description for richer semantic representation.
 */
function buildEmbedText(ticket: {
  title: string;
  description?: string;
  status: string;
  priority?: string;
}): string {
  return [
    ticket.title,
    ticket.description ?? "",
    `Status: ${ticket.status}`,
    ticket.priority ? `Priority: ${ticket.priority}` : "",
  ]
    .filter(Boolean)
    .join(". ")
    .trim();
}

/**
 * Embed a single ticket by ID.
 * Stores the vector in tickets.embedding.
 * Safe to call repeatedly — idempotent.
 */
export const embedTicket = action({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.runQuery(api.tickets.getById, { ticketId });
    if (!ticket) return { skipped: true, reason: "not_found" };

    const text = buildEmbedText(ticket);
    const embedding = await generateEmbedding(text);

    if (!embedding) return { skipped: true, reason: "no_api_key_or_error" };

    await ctx.runMutation(api.tickets.setEmbedding, {
      ticketId,
      embedding,
    });

    return { skipped: false, dims: embedding.length };
  },
});

/**
 * Internal action called by cron.
 * Embeds all tickets that:
 *   a) have no embedding yet, OR
 *   b) have been updated since their embedding was last generated
 *      (detected via a simple heuristic: embed all that were updated in the
 *       last 24 hours and have no embedding, or all unembedded tickets)
 *
 * Runs at most MAX_PER_RUN tickets per invocation to avoid timeouts.
 */
export const embedAllUnembedded = internalAction({
  args: {},
  handler: async (ctx) => {
    const MAX_PER_RUN = 50;
    const apiKey = process.env.VOYAGE_API_KEY;

    if (!apiKey) {
      console.log("embedAllUnembedded: VOYAGE_API_KEY not set, skipping.");
      return;
    }

    // Get all tickets without embeddings
    const unembedded = await ctx.runQuery(api.tickets.getUnembedded, {
      limit: MAX_PER_RUN,
    });

    let embedded = 0;
    for (const ticket of unembedded) {
      try {
        const text = buildEmbedText(ticket);
        const embedding = await generateEmbedding(text);
        if (embedding) {
          await ctx.runMutation(api.tickets.setEmbedding, {
            ticketId: ticket._id,
            embedding,
          });
          embedded++;
        }
      } catch (e) {
        console.error(`Failed to embed ticket ${ticket._id}:`, e);
      }
    }

    // Also re-embed recently updated tickets (updated in last 2 hours)
    const recentlyUpdated = await ctx.runQuery(api.tickets.getRecentlyUpdated, {
      since: Date.now() - 2 * 60 * 60 * 1000,
      limit: MAX_PER_RUN - embedded,
    });

    for (const ticket of recentlyUpdated) {
      try {
        const text = buildEmbedText(ticket);
        const embedding = await generateEmbedding(text);
        if (embedding) {
          await ctx.runMutation(api.tickets.setEmbedding, {
            ticketId: ticket._id,
            embedding,
          });
          embedded++;
        }
      } catch (e) {
        console.error(`Failed to re-embed ticket ${ticket._id}:`, e);
      }
    }

    console.log(`embedAllUnembedded: processed ${embedded} tickets`);
  },
});
