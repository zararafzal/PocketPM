interface StatusBadgeProps {
  status: string;
  size?: "sm" | "xs";
}

function getStatusStyle(status: string): {
  bg: string;
  color: string;
  label: string;
} {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed") || s.includes("resolved") || s.includes("complete")) {
    return { bg: "rgba(61, 214, 140, 0.12)", color: "var(--color-success)", label: status };
  }
  if (s.includes("progress") || s.includes("review") || s.includes("testing")) {
    return { bg: "rgba(157, 127, 234, 0.12)", color: "var(--color-ai-accent)", label: status };
  }
  if (s.includes("block") || s.includes("impede")) {
    return { bg: "rgba(242, 69, 61, 0.12)", color: "var(--color-danger)", label: status };
  }
  if (s.includes("hold") || s.includes("wait")) {
    return { bg: "rgba(245, 166, 35, 0.12)", color: "var(--color-warning)", label: status };
  }
  // Default: To Do / Open / Backlog
  return {
    bg: "rgba(139, 143, 154, 0.12)",
    color: "var(--color-text-muted)",
    label: status,
  };
}

export function StatusBadge({ status, size = "xs" }: StatusBadgeProps) {
  const { bg, color, label } = getStatusStyle(status);
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
