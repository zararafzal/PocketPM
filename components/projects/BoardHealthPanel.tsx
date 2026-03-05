"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
import { HealthBadge, HealthScoreGauge, HealthLabel } from "@/components/ui/HealthBadge";

interface BoardHealthPanelProps {
  projectId: Id<"projects">;
  healthScore: number;
  totalTickets: number;
  onTicketSelect?: (ticketId: string) => void;
}

interface BreakdownItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  bg: string;
}

function BreakdownItem({ icon, label, count, color, bg }: BreakdownItemProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: bg, border: `1px solid ${color}30` }}
    >
      <div style={{ color }}>{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
        <span
          className="text-xl font-semibold font-mono leading-none"
          style={{ color }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

export function BoardHealthPanel({
  projectId,
  healthScore,
  totalTickets,
  onTicketSelect,
}: BoardHealthPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const allTickets = useQuery(api.tickets.getByProject, { projectId });
  const worstTickets = useQuery(api.tickets.getWorstTickets, {
    projectId,
    limit: 5,
  });

  // Derive counts from live ticket data
  const complete =
    allTickets?.filter((t) => t.aiHealthLabel === "complete").length ?? 0;
  const needsWork =
    allTickets?.filter((t) => t.aiHealthLabel === "needs_work").length ?? 0;
  const broken =
    allTickets?.filter((t) => t.aiHealthLabel === "broken").length ?? 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Panel header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors text-left"
        style={{ borderBottom: expanded ? "1px solid var(--color-border)" : "none" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.02)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <div className="flex items-center gap-4">
          <HealthScoreGauge score={healthScore} />
          <div
            className="h-10 w-px"
            style={{ background: "var(--color-border)" }}
          />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Board Health
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--color-text-primary)" }}
            >
              {totalTickets} tickets scored
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick summary chips */}
          {allTickets && (
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--color-success)" }}
              >
                <CheckCircle2 size={12} />
                {complete}
              </span>
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--color-warning)" }}
              >
                <AlertTriangle size={12} />
                {needsWork}
              </span>
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--color-danger)" }}
              >
                <XCircle size={12} />
                {broken}
              </span>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={14} style={{ color: "var(--color-text-muted)" }} />
          ) : (
            <ChevronDown
              size={14}
              style={{ color: "var(--color-text-muted)" }}
            />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="p-5 space-y-5">
          {/* Breakdown row */}
          {allTickets ? (
            <div className="grid grid-cols-3 gap-3">
              <BreakdownItem
                icon={<CheckCircle2 size={16} />}
                label="Complete"
                count={complete}
                color="var(--color-success)"
                bg="rgba(61, 214, 140, 0.06)"
              />
              <BreakdownItem
                icon={<AlertTriangle size={16} />}
                label="Needs Work"
                count={needsWork}
                color="var(--color-warning)"
                bg="rgba(245, 166, 35, 0.06)"
              />
              <BreakdownItem
                icon={<XCircle size={16} />}
                label="Broken"
                count={broken}
                color="var(--color-danger)"
                bg="rgba(242, 69, 61, 0.06)"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-shimmer h-16 rounded-xl"
                  style={{ background: "var(--color-background)" }}
                />
              ))}
            </div>
          )}

          {/* Top 5 worst tickets */}
          {worstTickets && worstTickets.length > 0 && (broken > 0 || needsWork > 0) && (
            <div>
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Top issues to fix
              </p>
              <div className="space-y-1">
                {worstTickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    onClick={() => onTicketSelect?.(ticket._id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                  >
                    {/* Jira ID */}
                    <span
                      className="font-mono text-xs flex-shrink-0 w-20"
                      style={{ color: "var(--color-ai-accent)" }}
                    >
                      {ticket.jiraId ?? "—"}
                    </span>

                    {/* Title */}
                    <span
                      className="text-xs truncate flex-1"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ticket.title}
                    </span>

                    {/* Health badge */}
                    <div className="flex-shrink-0">
                      <HealthBadge
                        label={ticket.aiHealthLabel as HealthLabel}
                        score={ticket.aiHealthScore}
                      />
                    </div>

                    {/* Arrow on hover */}
                    <ArrowUpRight
                      size={12}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All healthy state */}
          {allTickets && broken === 0 && needsWork === 0 && complete > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{
                background: "rgba(61, 214, 140, 0.06)",
                border: "1px solid rgba(61, 214, 140, 0.15)",
              }}
            >
              <CheckCircle2
                size={14}
                style={{ color: "var(--color-success)" }}
              />
              <span
                className="text-xs"
                style={{ color: "var(--color-success)" }}
              >
                All tickets are well-specified. Great board hygiene!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
