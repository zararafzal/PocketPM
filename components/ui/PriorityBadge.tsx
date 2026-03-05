interface PriorityBadgeProps {
  priority?: string;
}

function getPriorityStyle(priority: string): {
  color: string;
  dot: string;
} {
  const p = priority.toLowerCase();
  if (p.includes("highest") || p.includes("critical") || p.includes("blocker")) {
    return { color: "var(--color-danger)", dot: "var(--color-danger)" };
  }
  if (p.includes("high")) {
    return { color: "var(--color-warning)", dot: "var(--color-warning)" };
  }
  if (p.includes("medium") || p.includes("normal")) {
    return { color: "var(--color-primary)", dot: "var(--color-primary)" };
  }
  // Low / Lowest / Minor / Trivial
  return { color: "var(--color-text-muted)", dot: "var(--color-border)" };
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) {
    return (
      <span
        className="text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        —
      </span>
    );
  }

  const { color, dot } = getPriorityStyle(priority);

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dot }}
      />
      <span className="text-xs" style={{ color }}>
        {priority}
      </span>
    </span>
  );
}
