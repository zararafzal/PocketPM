import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Write a value to the output cache.
 * If an entry with the same cacheKey already exists it is overwritten.
 *
 * @param ttlMs  Time-to-live in milliseconds. 0 = never expires.
 */
export const writeCache = mutation({
  args: {
    cacheKey: v.string(),
    output: v.string(),        // JSON string
    ttlMs: v.number(),         // 0 = no expiry
  },
  handler: async (ctx, { cacheKey, output, ttlMs }) => {
    const now = Date.now();
    const expiresAt = ttlMs > 0 ? now + ttlMs : 0;

    const existing = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { output, createdAt: now, expiresAt });
    } else {
      await ctx.db.insert("aiOutputCache", {
        cacheKey,
        output,
        createdAt: now,
        expiresAt,
      });
    }
  },
});

/**
 * Read a cache entry.
 * Returns null if the key does not exist or the TTL has expired.
 */
export const readCache = query({
  args: { cacheKey: v.string() },
  handler: async (ctx, { cacheKey }) => {
    const entry = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();

    if (!entry) return null;

    // Check expiry — expiresAt === 0 means no expiry
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) return null;

    return entry;
  },
});

/**
 * Invalidate (delete) a cache entry by key.
 * Called when underlying data changes and the cached value is stale.
 */
export const invalidateCache = mutation({
  args: { cacheKey: v.string() },
  handler: async (ctx, { cacheKey }) => {
    const entry = await ctx.db
      .query("aiOutputCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();
    if (entry) {
      await ctx.db.delete(entry._id);
    }
  },
});
