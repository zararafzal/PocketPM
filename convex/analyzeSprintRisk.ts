"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { callClaude, HAIKU, SONNET } from "./lib/callClaude";
import { Id } from "./_generated/dataModel";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface RiskFlag {
  id: string;
  type: "unestimated" | "overloaded" | "stale" | "thin_description";
  title: string;
  description: string;
  affectedTicketIds: string[];
  severity: "low" | "medium" | "high";
}

export interface SprintRiskOutput {
  riskLevel: "low" | "medium" | "high";
  flags: RiskFlag[];
  narrative: string;
  affectedTickets: string[];
}

// ─── System prompts ───────────────────────────────────────────────────────────

const HAIKU_SYSTEM_PROMPT = `You are a sprint health analyser. Evaluate ticket data against four risk criteria and return a structured risk assessment.

CRITERIA TO EVALUATE:
1. unestimated — Unestimated tickets exceed 30% of total tickets → severity "high"
2. overloaded  — Any assignee has >120% of the average load (by ticket count) → severity "high"  
3. stale       — Any active (non-done) tickets with no update in 5+ days → severity "medium"
4. thin_description — Any tickets with description shorter than 50 characters → severity "medium"

OUTPUT FORMAT — respond with ONLY valid JSON:
{
  "riskLevel": "<low|medium|high> — high if any high-severity flag exists, medium if any medium, low if none",
  "flags": [
    {
      "id": "<e.g. unestimated_001>",
      "type": "<unestimated|overloaded|stale|thin_description>",
      "title": "<concise flag title>",
      "description": "<1-2 sentence explanation with specific numbers and percentages>",
      "affectedTicketIds": ["<jiraId>", "..."],
      "severity": "<low|medium|high>"
    }
  ]
}

Only include flags that actually apply — omit criteria that pass. If all criteria pass, return empty flags array with riskLevel "low".
Return ONLY the JSON object. No markdown fences, no preamble.`;

const SONNET_SYSTEM_PROMPT = `You are a senior product manager writing a clear sprint risk narrative for stakeholders.

Given a list of detected risk flags, write a 2-3 paragraph assessment that:
1. Opens with the overall risk posture and what's driving it
2. Explains the most critical issues with specific impact (what could go wrong, by when)
3. Closes with concrete recommended actions the PM should take this week

Write in a professional, direct tone. Use specific numbers from the flags. No bullet points — flowing paragraphs only.
Respond with ONLY the narrative text. No JSON, no section headers, no markdown.`;

// ─── Action ──────────────────────────────────────────────────────────────────

export const analyzeSprintRisk = action({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { projectId, workspaceId }) => {
    // ── 1. Check cache (keyed on projectId + maxLastUpdated) ──────────────
    // Cache invalidates automatically when any ticket changes
    const maxLastUpdated = await ctx.runQuery(api.tickets.getMaxLastUpdated, {
      projectId,
    });
    const cacheKey = `sprint_risk:${projectId}:${maxLastUpdated}`;
    const cached = await ctx.runQuery(api.cache.readCache, { cacheKey });

    if (cached) {
      const cachedJobId = (await ctx.runMutation(api.aiJobs.createJob, {
        workspaceId,
        type: "sprint_risk",
        input: JSON.stringify({ projectId, cached: true }),
      })) as Id<"aiJobs">;

      await ctx.runMutation(api.aiJobs.setJobComplete, {
        jobId: cachedJobId,
        output: cached.output,
        modelUsed: "cached",
        tokensUsed: 0,
        cachedTokens: 0,
      });

      return { jobId: cachedJobId, fromCache: true };
    }

    // ── 2. Fetch tickets & project ────────────────────────────────────────
    const [tickets, project] = await Promise.all([
      ctx.runQuery(api.tickets.getByProject, { projectId }),
      ctx.runQuery(api.projects.getById, { projectId }),
    ]);

    // ── 3. PASS 1: Haiku — structural flag analysis ───────────────────────
    const ticketContext = buildTicketContext(tickets);

    const haikusResult = await callClaude(ctx, {
      workspaceId,
      model: "haiku",
      systemPrompt: HAIKU_SYSTEM_PROMPT,
      userMessage: ticketContext,
      jobType: "sprint_risk",
      jobInput: JSON.stringify({ projectId, pass: "haiku_flag_analysis" }),
    });

    // Parse Haiku output
    let flagData: { riskLevel: "low" | "medium" | "high"; flags: RiskFlag[] };
    try {
      const clean = haikusResult.output
        .trim()
        .replace(/^```json\s*/, "")
        .replace(/```\s*$/, "");
      flagData = JSON.parse(clean);
      if (!Array.isArray(flagData.flags)) throw new Error("Bad structure");
      if (!["low", "medium", "high"].includes(flagData.riskLevel)) {
        flagData.riskLevel = "medium";
      }
    } catch {
      // Fallback: derive flags manually from raw ticket data
      flagData = deriveBasicFlags(tickets);
    }

    // ── 4. PASS 2: Sonnet — narrative generation ──────────────────────────
    const narrativeMessage = buildNarrativeMessage(
      project,
      flagData,
      tickets.length
    );

    const sonnetResult = await callClaude(ctx, {
      workspaceId,
      model: "sonnet",
      systemPrompt: SONNET_SYSTEM_PROMPT,
      userMessage: narrativeMessage,
      jobType: "sprint_risk",
      jobInput: JSON.stringify({ projectId, pass: "sonnet_narrative" }),
    });

    // ── 5. Assemble final output ──────────────────────────────────────────
    const affectedTickets = [
      ...new Set(flagData.flags.flatMap((f) => f.affectedTicketIds)),
    ];

    const finalOutput: SprintRiskOutput = {
      riskLevel: flagData.riskLevel,
      flags: flagData.flags,
      narrative: sonnetResult.output.trim(),
      affectedTickets,
    };

    const outputStr = JSON.stringify(finalOutput);

    // Update Sonnet job with the combined final output
    await ctx.runMutation(api.aiJobs.setJobComplete, {
      jobId: sonnetResult.jobId,
      output: outputStr,
      modelUsed: `${HAIKU} + ${SONNET}`,
      tokensUsed: haikusResult.tokensUsed + sonnetResult.tokensUsed,
      cachedTokens: haikusResult.cachedTokens + sonnetResult.cachedTokens,
    });

    // ── 6. Cache with no TTL — invalidated by cache key change ───────────
    await ctx.runMutation(api.cache.writeCache, {
      cacheKey,
      output: outputStr,
      ttlMs: 0,
    });

    return { jobId: sonnetResult.jobId, fromCache: false };
  },
});

// ─── Ticket context builder (for Haiku) ───────────────────────────────────────

function buildTicketContext(
  tickets: Array<{
    jiraId?: string;
    title: string;
    status: string;
    assignee?: string;
    estimate?: number;
    description?: string;
    lastUpdated: number;
  }>
): string {
  const now = Date.now();
  const msPerDay = 86400000;
  const total = tickets.length;

  if (total === 0) {
    return "TOTAL TICKETS: 0\nNo tickets found in this project.";
  }

  // Unestimated
  const unestimated = tickets.filter((t) => !t.estimate);
  const unestPct = Math.round((unestimated.length / total) * 100);

  // Load by assignee
  const load: Record<string, { tickets: number; points: number }> = {};
  for (const t of tickets) {
    const a = t.assignee ?? "__unassigned__";
    if (!load[a]) load[a] = { tickets: 0, points: 0 };
    load[a].tickets++;
    load[a].points += t.estimate ?? 0;
  }
  const avgTickets = total / Math.max(Object.keys(load).length, 1);

  // Stale (5+ days, not done/closed)
  const doneKeywords = ["done", "closed", "resolved", "complete", "released"];
  const stale = tickets.filter(
    (t) =>
      now - t.lastUpdated > 5 * msPerDay &&
      !doneKeywords.some((k) => t.status.toLowerCase().includes(k))
  );

  // Thin description
  const thin = tickets.filter(
    (t) => !t.description || t.description.trim().length < 50
  );

  const lines = [
    `TOTAL TICKETS: ${total}`,
    `TODAY: ${new Date().toISOString().slice(0, 10)}`,
    "",
    `UNESTIMATED: ${unestimated.length}/${total} (${unestPct}%)`,
    ...unestimated.slice(0, 15).map(
      (t) => `  - ${t.jiraId ?? "??"}: ${t.title}`
    ),
    "",
    `ASSIGNEE LOAD (avg ${avgTickets.toFixed(1)} tickets each):`,
    ...Object.entries(load).map(
      ([a, s]) =>
        `  ${a === "__unassigned__" ? "Unassigned" : a}: ${s.tickets} tickets, ${s.points}pts` +
        (s.tickets > avgTickets * 1.2 ? " ← OVERLOADED" : "")
    ),
    "",
    `STALE TICKETS (active, no update 5+ days): ${stale.length}`,
    ...stale.slice(0, 12).map((t) => {
      const days = Math.floor((now - t.lastUpdated) / msPerDay);
      return `  - ${t.jiraId ?? "??"}: ${t.title} [${t.status}] — ${days}d`;
    }),
    "",
    `THIN DESCRIPTION (<50 chars): ${thin.length}`,
    ...thin.slice(0, 12).map(
      (t) =>
        `  - ${t.jiraId ?? "??"}: ${t.title} (${t.description?.trim().length ?? 0} chars)`
    ),
  ];

  return lines.join("\n");
}

// ─── Narrative message builder (for Sonnet) ──────────────────────────────────

function buildNarrativeMessage(
  project: { name: string; jiraProjectKey?: string | null } | null,
  flagData: { riskLevel: string; flags: RiskFlag[] },
  totalTickets: number
): string {
  const flagSummary =
    flagData.flags.length === 0
      ? "No risk flags detected — sprint appears healthy."
      : flagData.flags
          .map(
            (f) =>
              `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}` +
              (f.affectedTicketIds.length > 0
                ? ` Affects: ${f.affectedTicketIds.slice(0, 6).join(", ")}${f.affectedTicketIds.length > 6 ? ` +${f.affectedTicketIds.length - 6} more` : ""}`
                : "")
          )
          .join("\n");

  return [
    `PROJECT: ${project?.name ?? "Unknown"} (${project?.jiraProjectKey ?? "?"})`,
    `TOTAL TICKETS: ${totalTickets}`,
    `OVERALL RISK LEVEL: ${flagData.riskLevel.toUpperCase()}`,
    `FLAGS DETECTED: ${flagData.flags.length}`,
    "",
    "FLAG DETAILS:",
    flagSummary,
    "",
    "Write a sprint risk narrative based on these findings.",
  ].join("\n");
}

// ─── Fallback: derive flags from raw data (if Haiku parse fails) ─────────────

function deriveBasicFlags(
  tickets: Array<{
    jiraId?: string;
    title: string;
    status: string;
    assignee?: string;
    estimate?: number;
    description?: string;
    lastUpdated: number;
  }>
): { riskLevel: "low" | "medium" | "high"; flags: RiskFlag[] } {
  const now = Date.now();
  const msPerDay = 86400000;
  const flags: RiskFlag[] = [];
  const total = tickets.length;

  if (total === 0) return { riskLevel: "low", flags: [] };

  // Unestimated
  const unestimated = tickets.filter((t) => !t.estimate);
  if (unestimated.length / total > 0.3) {
    flags.push({
      id: "unestimated_001",
      type: "unestimated",
      title: "High proportion of unestimated tickets",
      description: `${unestimated.length} of ${total} tickets (${Math.round((unestimated.length / total) * 100)}%) have no story point estimate.`,
      affectedTicketIds: unestimated.slice(0, 10).map((t) => t.jiraId ?? "??"),
      severity: "high",
    });
  }

  // Stale
  const doneKeywords = ["done", "closed", "resolved", "complete"];
  const stale = tickets.filter(
    (t) =>
      now - t.lastUpdated > 5 * msPerDay &&
      !doneKeywords.some((k) => t.status.toLowerCase().includes(k))
  );
  if (stale.length > 0) {
    flags.push({
      id: "stale_001",
      type: "stale",
      title: `${stale.length} tickets with no recent activity`,
      description: `${stale.length} active ticket${stale.length > 1 ? "s have" : " has"} not been updated in 5+ days.`,
      affectedTicketIds: stale.slice(0, 10).map((t) => t.jiraId ?? "??"),
      severity: "medium",
    });
  }

  // Thin descriptions
  const thin = tickets.filter(
    (t) => !t.description || t.description.trim().length < 50
  );
  if (thin.length > 0) {
    flags.push({
      id: "thin_001",
      type: "thin_description",
      title: `${thin.length} tickets with insufficient description`,
      description: `${thin.length} ticket${thin.length > 1 ? "s have" : " has"} a description shorter than 50 characters.`,
      affectedTicketIds: thin.slice(0, 10).map((t) => t.jiraId ?? "??"),
      severity: "medium",
    });
  }

  const hasHigh = flags.some((f) => f.severity === "high");
  const hasMedium = flags.some((f) => f.severity === "medium");
  const riskLevel: "low" | "medium" | "high" = hasHigh
    ? "high"
    : hasMedium
      ? "medium"
      : "low";

  return { riskLevel, flags };
}
