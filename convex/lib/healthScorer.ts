/**
 * Rule-based ticket health scorer.
 * Pure function — no I/O, no side effects, safe to import in any Convex context.
 *
 * Scoring bands (per spec):
 *   broken     (0–30)  — no description at all
 *   needs_work (31–60) — description < 50 chars, OR no assignee, OR no estimate
 *   complete   (61–100)— description ≥ 50 chars AND assignee AND estimate present
 *
 * Within each band the score is graduated so the project average is meaningful.
 */

export type HealthLabel = "complete" | "needs_work" | "broken";

export interface HealthScore {
  score: number;       // 0–100
  label: HealthLabel;
}

export interface ScoringInput {
  description?: string;
  assignee?: string;
  estimate?: number | null;
}

export function scoreTicket(ticket: ScoringInput): HealthScore {
  const descLen = (ticket.description ?? "").trim().length;
  const hasAssignee = !!ticket.assignee?.trim();
  const hasEstimate = ticket.estimate != null && ticket.estimate > 0;

  // ── 1. Determine label (hard rules from spec) ────────────────────────────
  let label: HealthLabel;
  if (descLen === 0) {
    label = "broken";
  } else if (descLen < 50 || !hasAssignee || !hasEstimate) {
    label = "needs_work";
  } else {
    label = "complete";
  }

  // ── 2. Compute a graduated raw score ─────────────────────────────────────
  // Four dimensions, each contributing up to 25 points:
  //   • Description presence + length   (0 | 10 | 25 points)
  //   • Description quality bonus        (0–25 points)
  //   • Assignee present                 (0 | 25 points)
  //   • Estimate present                 (0 | 25 points)
  let raw = 0;

  // Description presence
  if (descLen === 0) {
    raw += 0;
  } else if (descLen < 50) {
    raw += 10;
  } else {
    raw += 25;
  }

  // Description quality bonus (additional richness)
  if (descLen >= 500) raw += 25;
  else if (descLen >= 200) raw += 18;
  else if (descLen >= 100) raw += 12;
  else if (descLen >= 50) raw += 5;

  // Assignee
  if (hasAssignee) raw += 25;

  // Estimate
  if (hasEstimate) raw += 25;

  raw = Math.min(raw, 100);

  // ── 3. Enforce band constraints ──────────────────────────────────────────
  if (label === "broken") {
    raw = Math.max(5, Math.min(raw, 30));
  } else if (label === "needs_work") {
    raw = Math.max(31, Math.min(raw, 60));
  } else {
    raw = Math.max(61, Math.min(raw, 100));
  }

  return { score: raw, label };
}

/**
 * Compute the project-level health score from an array of ticket scores.
 * Returns 0 if there are no scored tickets.
 */
export function computeProjectHealth(scores: number[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg);
}

/**
 * Categorise a health score into a human-readable label.
 * Used for colour-coding the project health chip on the dashboard.
 */
export function healthChipLabel(score: number): string {
  if (score === 0) return "No data";
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs work";
  return "At risk";
}

export function healthChipColor(score: number): string {
  if (score === 0) return "var(--color-text-muted)";
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-primary)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}
