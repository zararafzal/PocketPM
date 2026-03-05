export type HealthLabel = "complete" | "needs_work" | "broken";

interface HealthBadgeProps {
  label: HealthLabel;
  score?: number;
  size?: "xs" | "sm";
}

const CONFIG: Record<
  HealthLabel,
  { text: string; bg: string; color: string; dot: string }
> = {
  complete: {
    text: "Complete",
    bg: "rgba(61, 214, 140, 0.12)",
    color: "var(--color-success)",
    dot: "var(--color-success)",
  },
  needs_work: {
    text: "Needs Work",
    bg: "rgba(245, 166, 35, 0.12)",
    color: "var(--color-warning)",
    dot: "var(--color-warning)",
  },
  broken: {
    text: "Broken",
    bg: "rgba(242, 69, 61, 0.12)",
    color: "var(--color-danger)",
    dot: "var(--color-danger)",
  },
};

export function HealthBadge({ label, score, size = "xs" }: HealthBadgeProps) {
  const { text, bg, color, dot } = CONFIG[label];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: bg, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dot }}
      />
      {text}
      {score != null && (
        <span className="font-mono opacity-70">{score}</span>
      )}
    </span>
  );
}

/**
 * Large health score display for the Board Health panel header.
 */
interface HealthScoreGaugeProps {
  score: number;
}

export function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 60
      ? "var(--color-primary)"
      : score >= 40
      ? "var(--color-warning)"
      : "var(--color-danger)";

  const label =
    score >= 80
      ? "Healthy"
      : score >= 60
      ? "Fair"
      : score >= 40
      ? "Needs Work"
      : "At Risk";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-1.5">
        <span
          className="text-3xl font-semibold font-mono leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span
          className="text-sm font-mono mb-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          / 100
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
      {/* Progress bar */}
      <div
        className="h-1 w-24 rounded-full overflow-hidden mt-1"
        style={{ background: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
