import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Sync all Jira tickets every 15 minutes.
 */
crons.interval(
  "sync all jira projects",
  { minutes: 15 },
  internal.jira.syncAllConnectedProjects
);

/**
 * Reset all AI usage counters at midnight UTC.
 * The aiUsage table naturally resets by date, but we also zero out
 * the workspace.aiActionsToday field used by the live dashboard counter.
 */
crons.daily(
  "reset daily AI usage counters",
  { hourUTC: 0, minuteUTC: 0 },
  internal.aiUsage.resetAllDailyCounters
);

/**
 * Embed unembedded tickets every hour.
 * Processes up to 50 tickets per run — catches new imports and re-embeds stale ones.
 * No-ops gracefully if VOYAGE_API_KEY is not configured.
 */
crons.interval(
  "embed unembedded tickets",
  { hours: 1 },
  internal.embeddings.embedAllUnembedded
);

export default crons;
