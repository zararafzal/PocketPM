"use client";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-background)",
        height: "60px",
      }}
    >
      <div className="flex flex-col justify-center">
        <h1
          className="text-sm font-semibold leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
