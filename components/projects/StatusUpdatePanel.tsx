"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  X,
  Copy,
  Check,
  Sparkles,
  FileText,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import type { StatusUpdateOutput } from "@/convex/draftStatusUpdate";

interface StatusUpdatePanelProps {
  jobId: Id<"aiJobs">;
  projectName: string;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function StatusUpdatePanel({
  jobId,
  projectName,
  onClose,
  onRegenerate,
  isRegenerating = false,
}: StatusUpdatePanelProps) {
  const job = useQuery(api.aiJobs.getById, { jobId });
  const [copied, setCopied] = useState(false);
  const [parsed, setParsed] = useState<StatusUpdateOutput | null>(null);

  // Parse JSON once job is complete
  useEffect(() => {
    if (job?.status === "complete" && job.output) {
      try {
        const data = JSON.parse(job.output) as StatusUpdateOutput;
        setParsed(data);
      } catch {
        setParsed(null);
      }
    }
  }, [job?.status, job?.output]);

  const isStreaming = job?.status === "running";
  const isFailed = job?.status === "failed";
  const isComplete = job?.status === "complete" && parsed !== null;

  const handleCopySlack = async () => {
    if (!parsed?.slackReady) return;
    try {
      await navigator.clipboard.writeText(parsed.slackReady);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently fail
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid rgba(157, 127, 234, 0.3)",
        boxShadow: "0 0 0 1px rgba(157, 127, 234, 0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "rgba(157, 127, 234, 0.05)",
          borderLeft: "3px solid var(--color-ai-accent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md"
            style={{ background: "rgba(157, 127, 234, 0.15)" }}
          >
            <Sparkles size={13} style={{ color: "var(--color-ai-accent)" }} />
          </div>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Status Update Draft
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {projectName} · {isStreaming ? "Generating…" : isComplete ? "Ready to copy" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              <button
                onClick={handleCopySlack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: copied
                    ? "rgba(61, 214, 140, 0.15)"
                    : "rgba(157, 127, 234, 0.12)",
                  border: `1px solid ${copied ? "rgba(61, 214, 140, 0.3)" : "rgba(157, 127, 234, 0.25)"}`,
                  color: copied
                    ? "var(--color-success)"
                    : "var(--color-ai-accent)",
                  cursor: "pointer",
                }}
              >
                {copied ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
                {copied ? "Copied!" : "Copy for Slack"}
              </button>
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
                <RefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                Regenerate
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Loading / streaming state */}
        {(isStreaming || isRegenerating) && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
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
                Drafting status update…
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Analysing {isStreaming ? "ticket data" : "sprint"} with Claude Sonnet
              </p>
            </div>
            {/* Streaming progress indicator */}
            <div
              className="flex gap-1"
            >
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
                Generation failed
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                {job?.output
                  ? (() => {
                      try {
                        return JSON.parse(job.output).error;
                      } catch {
                        return job.output;
                      }
                    })()
                  : "An unknown error occurred. Please try again."}
              </p>
            </div>
          </div>
        )}

        {/* Complete state — three paragraphs */}
        {isComplete && parsed && (
          <div className="space-y-5">
            <UpdateSection
              icon={<FileText size={14} />}
              label="Progress"
              content={parsed.progress}
              color="var(--color-success)"
            />
            <UpdateSection
              icon={<AlertTriangle size={14} />}
              label="Risks"
              content={parsed.risks}
              color="var(--color-warning)"
            />
            <UpdateSection
              icon={<CalendarDays size={14} />}
              label="Next Week"
              content={parsed.nextWeek}
              color="var(--color-ai-accent)"
            />

            {/* Slack preview */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Slack-ready version
                </span>
                <button
                  onClick={handleCopySlack}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{
                    color: copied ? "var(--color-success)" : "var(--color-ai-accent)",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre
                className="text-xs whitespace-pre-wrap leading-relaxed"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                {parsed.slackReady}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function UpdateSection({
  icon,
  label,
  content,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color }}>{icon}</span>
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--color-text-primary)" }}
      >
        {content}
      </p>
    </div>
  );
}
