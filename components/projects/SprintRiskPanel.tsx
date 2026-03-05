"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import type { SprintRiskOutput, RiskFlag } from "@/convex/analyzeSprintRisk";

interface SprintRiskPanelProps {
  jobId: Id<"aiJobs">;
  projectId: Id<"projects">;
  workspaceId: Id<"workspaces">;
  onClose: () => void;
  onRegenerate: () => void;
  onTicketSelect?: (ticketId: string) => void;
  isRegenerating?: boolean;
}

const RISK_CONFIG = {
  high: {
    label: "High Risk",
    icon: AlertTriangle,
    bg: "rgba(242, 69, 61, 0.08)",
    border: "rgba(242, 69, 61, 0.3)",
    color: "var(--color-danger)",
    headerBg: "rgba(242, 69, 61, 0.12)",
  },
  medium: {
    label: "Medium Risk",
    icon: AlertCircle,
    bg: "rgba(245, 166, 35, 0.08)",
    border: "rgba(245, 166, 35, 0.3)",
    color: "var(--color-warning)",
    headerBg: "rgba(245, 166, 35, 0.12)",
  },
  low: {
    label: "Low Risk",
    icon: CheckCircle2,
    bg: "rgba(61, 214, 140, 0.08)",
    border: "rgba(61, 214, 140, 0.3)",
    color: "var(--color-success)",
    headerBg: "rgba(61, 214, 140, 0.12)",
  },
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  unestimated: "Unestimated tickets",
  overloaded: "Assignee overloaded",
  stale: "Stale tickets",
  thin_description: "Thin descriptions",
};

export function SprintRiskPanel({
  jobId,
  projectId,
  workspaceId,
  onClose,
  onRegenerate,
  onTicketSelect,
  isRegenerating = false,
}: SprintRiskPanelProps) {
  const job = useQuery(api.aiJobs.getById, { jobId });
  const dismissedIds = useQuery(api.dismissedFlags.getDismissed, {
    workspaceId,
    projectId,
  });
  const dismissFlag = useMutation(api.dismissedFlags.dismissFlag);
  const restoreFlag = useMutation(api.dismissedFlags.restoreFlag);

  const [parsed, setParsed] = useState<SprintRiskOutput | null>(null);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    if (job?.status === "complete" && job.output) {
      try {
        setParsed(JSON.parse(job.output) as SprintRiskOutput);
      } catch {
        setParsed(null);
      }
    }
  }, [job?.status, job?.output]);

  const isStreaming = job?.status === "running";
  const isFailed = job?.status === "failed";
  const isComplete = job?.status === "complete" && parsed !== null;

  const dismissed = new Set(dismissedIds ?? []);
  const activeFlags = parsed?.flags.filter((f) => !dismissed.has(f.id)) ?? [];
  const dismissedFlags = parsed?.flags.filter((f) => dismissed.has(f.id)) ?? [];

  const riskLevel = parsed?.riskLevel ?? "low";
  const config = RISK_CONFIG[riskLevel];
  const RiskIcon = config.icon;

  const handleDismiss = (flagId: string) => {
    dismissFlag({ workspaceId, projectId, flagId });
  };

  const handleRestore = (flagId: string) => {
    restoreFlag({ workspaceId, projectId, flagId });
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${isComplete ? config.border : "rgba(157, 127, 234, 0.3)"}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: isComplete ? config.headerBg : "rgba(157, 127, 234, 0.05)",
          borderLeft: `3px solid ${isComplete ? config.color : "var(--color-ai-accent)"}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md"
            style={{
              background: isComplete
                ? `${config.color}22`
                : "rgba(157, 127, 234, 0.15)",
            }}
          >
            {isComplete ? (
              <RiskIcon
                size={13}
                style={{ color: config.color }}
              />
            ) : (
              <Sparkles size={13} style={{ color: "var(--color-ai-accent)" }} />
            )}
          </div>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {isComplete ? config.label : "Sprint Risk Analysis"}
            </h3>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {isComplete
                ? `${activeFlags.length} active flag${activeFlags.length !== 1 ? "s" : ""}${dismissedFlags.length > 0 ? `, ${dismissedFlags.length} dismissed` : ""}`
                : isStreaming
                  ? "Analysing sprint health…"
                  : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                color: isRegenerating
                  ? "var(--color-text-muted)"
                  : "var(--color-text-primary)",
                cursor: isRegenerating ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw
                size={12}
                className={isRegenerating ? "animate-spin" : ""}
              />
              Re-analyse
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--color-text-muted)", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Loading state */}
        {(isStreaming || isRegenerating) && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(157, 127, 234, 0.1)",
                border: "1px solid rgba(157, 127, 234, 0.2)",
              }}
            >
              <Sparkles
                size={18}
                className="animate-pulse"
                style={{ color: "var(--color-ai-accent)" }}
              />
            </div>
            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                Checking sprint risks…
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Haiku scanning flags · Sonnet writing narrative
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "var(--color-ai-accent)",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div
            className="flex items-start gap-3 p-4 rounded-lg"
            style={{
              background: "rgba(242, 69, 61, 0.08)",
              border: "1px solid rgba(242, 69, 61, 0.2)",
            }}
          >
            <AlertTriangle
              size={16}
              className="flex-shrink-0 mt-0.5"
              style={{ color: "var(--color-danger)" }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-danger)" }}
              >
                Analysis failed
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                {job?.output
                  ? (() => {
                      try {
                        return JSON.parse(job.output).error;
                      } catch {
                        return job.output;
                      }
                    })()
                  : "An error occurred. Try re-analysing."}
              </p>
            </div>
          </div>
        )}

        {/* Complete: no flags */}
        {isComplete && activeFlags.length === 0 && dismissedFlags.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 py-6 rounded-lg"
            style={{
              background: "rgba(61, 214, 140, 0.06)",
              border: "1px solid rgba(61, 214, 140, 0.2)",
            }}
          >
            <CheckCircle2 size={24} style={{ color: "var(--color-success)" }} />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-success)" }}
            >
              No risk flags detected
            </p>
            <p
              className="text-xs text-center max-w-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Sprint looks healthy — all tickets are estimated, assignees are
              balanced, and descriptions are adequate.
            </p>
          </div>
        )}

        {/* Active flags */}
        {isComplete && activeFlags.length > 0 && (
          <div className="space-y-2">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Active flags
            </p>
            {activeFlags.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                onDismiss={() => handleDismiss(flag.id)}
                onTicketSelect={onTicketSelect}
              />
            ))}
          </div>
        )}

        {/* Narrative section */}
        {isComplete && parsed?.narrative && (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
              style={{
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
                border: "none",
              }}
              onClick={() => setNarrativeExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  size={13}
                  style={{ color: "var(--color-ai-accent)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  AI Risk Narrative
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(157, 127, 234, 0.12)",
                    color: "var(--color-ai-accent)",
                    fontSize: "10px",
                  }}
                >
                  Sonnet
                </span>
              </div>
              {narrativeExpanded ? (
                <ChevronDown
                  size={14}
                  style={{ color: "var(--color-text-muted)" }}
                />
              ) : (
                <ChevronRight
                  size={14}
                  style={{ color: "var(--color-text-muted)" }}
                />
              )}
            </button>

            {narrativeExpanded && (
              <div
                className="px-4 pb-4 pt-0"
                style={{
                  borderTop: "1px solid var(--color-border)",
                  borderLeft: "3px solid var(--color-ai-accent)",
                }}
              >
                <p
                  className="text-sm leading-relaxed mt-3 whitespace-pre-wrap"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {parsed.narrative}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dismissed flags (collapsible) */}
        {isComplete && dismissedFlags.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1.5 text-xs mb-2 transition-colors"
              style={{
                color: "var(--color-text-muted)",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
              }}
              onClick={() => setShowDismissed((v) => !v)}
            >
              {showDismissed ? (
                <EyeOff size={12} />
              ) : (
                <Eye size={12} />
              )}
              {showDismissed ? "Hide" : "Show"} {dismissedFlags.length} dismissed flag
              {dismissedFlags.length !== 1 ? "s" : ""}
            </button>

            {showDismissed && (
              <div className="space-y-2 opacity-50">
                {dismissedFlags.map((flag) => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    dismissed
                    onRestore={() => handleRestore(flag.id)}
                    onTicketSelect={onTicketSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Flag card ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  high: { color: "var(--color-danger)", bg: "rgba(242, 69, 61, 0.08)" },
  medium: { color: "var(--color-warning)", bg: "rgba(245, 166, 35, 0.08)" },
  low: { color: "var(--color-success)", bg: "rgba(61, 214, 140, 0.08)" },
};

function FlagCard({
  flag,
  dismissed = false,
  onDismiss,
  onRestore,
  onTicketSelect,
}: {
  flag: RiskFlag;
  dismissed?: boolean;
  onDismiss?: () => void;
  onRestore?: () => void;
  onTicketSelect?: (ticketId: string) => void;
}) {
  const sc = SEVERITY_CONFIG[flag.severity] ?? SEVERITY_CONFIG.medium;

  return (
    <div
      className="rounded-lg p-3.5"
      style={{
        background: sc.bg,
        border: `1px solid ${sc.color}33`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: sc.color }}
            >
              {flag.severity}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "var(--color-text-muted)",
                fontSize: "10px",
              }}
            >
              {FLAG_TYPE_LABELS[flag.type] ?? flag.type}
            </span>
          </div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            {flag.title}
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            {flag.description}
          </p>

          {/* Affected ticket IDs */}
          {flag.affectedTicketIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {flag.affectedTicketIds.slice(0, 8).map((tid) => (
                <button
                  key={tid}
                  onClick={() => onTicketSelect?.(tid)}
                  className="font-mono text-xs px-1.5 py-0.5 rounded transition-all"
                  style={{
                    background: "rgba(157, 127, 234, 0.12)",
                    color: "var(--color-ai-accent)",
                    border: "1px solid rgba(157, 127, 234, 0.2)",
                    cursor: onTicketSelect ? "pointer" : "default",
                  }}
                >
                  {tid}
                </button>
              ))}
              {flag.affectedTicketIds.length > 8 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  +{flag.affectedTicketIds.length - 8} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dismiss / Restore button */}
        <button
          onClick={dismissed ? onRestore : onDismiss}
          className="flex-shrink-0 text-xs px-2 py-1 rounded transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title={dismissed ? "Restore this flag" : "Dismiss this flag"}
        >
          {dismissed ? "Restore" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
