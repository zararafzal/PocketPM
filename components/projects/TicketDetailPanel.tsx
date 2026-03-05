"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Clock,
  Command,
  FileText,
  Hash,
  Sparkles,
  Tag,
  User2,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { HealthBadge, HealthLabel } from "@/components/ui/HealthBadge";
import { RewriteDiffView } from "./RewriteDiffView";
import { useSlashCommand } from "@/components/slash/SlashCommandContext";

interface Ticket {
  _id: Id<"tickets">;
  jiraId?: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  priority?: string;
  estimate?: number;
  aiHealthLabel?: string;
  aiHealthScore?: number;
  lastUpdated: number;
  workspaceId: Id<"workspaces">;
}

interface TicketDetailPanelProps {
  ticket: Ticket;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TicketDetailPanel({ ticket, onClose }: TicketDetailPanelProps) {
  const [rewriteJobId, setRewriteJobId] = useState<Id<"aiJobs"> | null>(null);
  const [isStartingRewrite, setIsStartingRewrite] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const rewriteTicketAction = useAction(api.rewriteTicket.rewriteTicket);
  const { setSlashContext, openBar } = useSlashCommand();

  // ── Rewrite handler ───────────────────────────────────────────────────────
  const handleRewrite = async () => {
    setIsStartingRewrite(true);
    setRewriteError(null);
    try {
      const result = await rewriteTicketAction({
        ticketId: ticket._id,
        workspaceId: ticket.workspaceId,
      });
      setRewriteJobId(result.jobId as Id<"aiJobs">);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rewrite failed";
      setRewriteError(
        msg.includes("USAGE_LIMIT_EXCEEDED")
          ? "Daily limit of 20 AI actions reached. Resets at midnight UTC."
          : msg
      );
    } finally {
      setIsStartingRewrite(false);
    }
  };

  // ── Stable ref so slash bar always gets the latest handler ────────────────
  const handleRewriteRef = useRef(handleRewrite);
  useEffect(() => {
    handleRewriteRef.current = handleRewrite;
  });

  // ── Register ticket context into the global slash bar ─────────────────────
  useEffect(() => {
    setSlashContext((prev) => ({
      ...prev,
      selectedTicket: {
        _id: ticket._id,
        title: ticket.title,
        workspaceId: ticket.workspaceId,
      },
      onRewrite: () => handleRewriteRef.current(),
    }));

    // Clear ticket context when panel closes
    return () => {
      setSlashContext((prev) => {
        const { selectedTicket, onRewrite, ...rest } = prev;
        return rest;
      });
    };
  }, [ticket._id, setSlashContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRewriteClose = () => setRewriteJobId(null);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden animate-fade-in"
        style={{
          width: "480px",
          marginRight: "var(--ai-panel-width)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex-1 min-w-0 pr-3">
            {ticket.jiraId && (
              <span
                className="font-mono text-xs block mb-1"
                style={{ color: "var(--color-ai-accent)" }}
              >
                {ticket.jiraId}
              </span>
            )}
            <h2
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {ticket.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaField label="Status" icon={<Tag size={12} />}>
              <StatusBadge status={ticket.status} />
            </MetaField>
            <MetaField label="Priority" icon={<Hash size={12} />}>
              <PriorityBadge priority={ticket.priority} />
            </MetaField>
            <MetaField label="Assignee" icon={<User2 size={12} />}>
              {ticket.assignee ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      background: "rgba(110, 86, 207, 0.2)",
                      color: "var(--color-primary)",
                      fontSize: "10px",
                    }}
                  >
                    {ticket.assignee[0].toUpperCase()}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {ticket.assignee}
                  </span>
                </div>
              ) : (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Unassigned
                </span>
              )}
            </MetaField>
            <MetaField label="Story Points" icon={<Hash size={12} />}>
              <span
                className="font-mono text-xs"
                style={{
                  color: ticket.estimate
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                }}
              >
                {ticket.estimate ?? "Not estimated"}
              </span>
            </MetaField>
            <MetaField label="Health" icon={<Sparkles size={12} />}>
              {ticket.aiHealthLabel ? (
                <HealthBadge
                  label={ticket.aiHealthLabel as HealthLabel}
                  score={ticket.aiHealthScore}
                />
              ) : (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Not scored
                </span>
              )}
            </MetaField>
            <MetaField label="Last updated" icon={<Clock size={12} />}>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {formatDate(ticket.lastUpdated)}
              </span>
            </MetaField>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText
                size={12}
                style={{ color: "var(--color-text-muted)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Description
              </span>
            </div>
            {ticket.description ? (
              <div
                className="text-xs leading-relaxed rounded-lg p-3 whitespace-pre-wrap"
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {ticket.description}
              </div>
            ) : (
              <div
                className="text-xs italic rounded-lg p-3"
                style={{
                  background: "rgba(242, 69, 61, 0.05)",
                  border: "1px solid rgba(242, 69, 61, 0.15)",
                  color: "var(--color-danger)",
                }}
              >
                No description — this ticket is missing context. Use &quot;Rewrite
                with AI&quot; to generate one.
              </div>
            )}
          </div>

          {/* Slash bar hint */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(157,127,234,0.05)",
              border: "1px solid rgba(157,127,234,0.15)",
            }}
          >
            <Sparkles size={11} style={{ color: "var(--color-ai-accent)" }} />
            <span
              className="text-xs flex-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              This ticket is active in the AI command bar
            </span>
            <button
              onClick={openBar}
              className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: "rgba(157,127,234,0.1)",
                border: "1px solid rgba(157,127,234,0.2)",
                color: "var(--color-ai-accent)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              <Command size={9} />K
            </button>
          </div>

          {/* Rewrite error */}
          {rewriteError && (
            <div
              className="text-xs rounded-lg px-3 py-2.5"
              style={{
                background: "rgba(242, 69, 61, 0.08)",
                border: "1px solid rgba(242, 69, 61, 0.2)",
                color: "var(--color-danger)",
              }}
            >
              {rewriteError}
            </div>
          )}
        </div>

        {/* Footer — AI Rewrite button */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={handleRewrite}
            disabled={isStartingRewrite || !!rewriteJobId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background:
                isStartingRewrite || rewriteJobId
                  ? "rgba(157, 127, 234, 0.08)"
                  : "rgba(157, 127, 234, 0.15)",
              border: "1px solid rgba(157, 127, 234, 0.3)",
              color:
                isStartingRewrite || rewriteJobId
                  ? "var(--color-text-muted)"
                  : "var(--color-ai-accent)",
              cursor:
                isStartingRewrite || rewriteJobId ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isStartingRewrite && !rewriteJobId) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(157, 127, 234, 0.22)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isStartingRewrite && !rewriteJobId) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(157, 127, 234, 0.15)";
              }
            }}
          >
            <Sparkles
              size={14}
              className={isStartingRewrite ? "animate-pulse-ai" : ""}
            />
            {isStartingRewrite
              ? "Starting rewrite…"
              : rewriteJobId
              ? "Rewrite in progress"
              : "Rewrite with AI"}
          </button>
          <p
            className="text-xs text-center mt-1.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Uses 1 of your 20 daily AI actions · Sonnet · or type{" "}
            <span
              className="font-mono"
              style={{ color: "var(--color-ai-accent)" }}
            >
              /rewrite
            </span>
          </p>
        </div>
      </div>

      {/* Rewrite diff overlay */}
      {rewriteJobId && (
        <RewriteDiffView
          jobId={rewriteJobId}
          originalTicket={{
            title: ticket.title,
            description: ticket.description ?? "",
          }}
          ticketId={ticket._id}
          onClose={handleRewriteClose}
          onAccepted={onClose}
          onRegenerate={handleRewrite}
        />
      )}
    </>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function MetaField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg"
      style={{
        background: "var(--color-background)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex items-center gap-1 text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
