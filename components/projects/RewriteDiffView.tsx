"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Check,
  Edit3,
  RefreshCw,
  X,
  Sparkles,
  ChevronRight,
  Copy,
} from "lucide-react";
import type { RewriteOutput } from "@/convex/rewriteTicket";

interface RewriteDiffViewProps {
  jobId: Id<"aiJobs">;
  originalTicket: { title: string; description: string };
  ticketId: Id<"tickets">;
  onClose: () => void;
  onAccepted: () => void;
  /** Optional — called when PM clicks Regenerate. Parent is responsible for starting a new job. */
  onRegenerate?: () => void;
}

type ConfidenceBorder = "solid" | "dashed" | "grey";

function getConfidenceBorder(confidence?: string): ConfidenceBorder {
  if (confidence === "high") return "solid";
  if (confidence === "medium") return "dashed";
  return "grey";
}

function ConfidencePill({ confidence }: { confidence?: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    high: {
      bg: "rgba(61, 214, 140, 0.1)",
      color: "var(--color-success)",
      label: "High confidence",
    },
    medium: {
      bg: "rgba(245, 166, 35, 0.1)",
      color: "var(--color-warning)",
      label: "Medium confidence — review carefully",
    },
    low: {
      bg: "rgba(139, 143, 154, 0.1)",
      color: "var(--color-text-muted)",
      label: "Low confidence — AI made assumptions",
    },
  };
  const cfg = colors[confidence ?? "low"];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function DiffColumn({
  label,
  children,
  side,
  confidence,
}: {
  label: string;
  children: React.ReactNode;
  side: "before" | "after";
  confidence?: string;
}) {
  const border = side === "after" ? getConfidenceBorder(confidence) : null;

  const borderStyle =
    border === "solid"
      ? "3px solid var(--color-ai-accent)"
      : border === "dashed"
      ? "3px dashed var(--color-ai-accent)"
      : border === "grey"
      ? "3px solid var(--color-border)"
      : "1px solid var(--color-border)";

  return (
    <div
      className="flex-1 rounded-xl overflow-hidden"
      style={{
        background:
          side === "after"
            ? "rgba(157, 127, 234, 0.04)"
            : "var(--color-background)",
        border: side === "after" ? borderStyle : "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          borderBottom: `1px solid var(--color-border)`,
          background:
            side === "after"
              ? "rgba(157, 127, 234, 0.06)"
              : "rgba(255,255,255,0.02)",
        }}
      >
        {side === "after" && (
          <Sparkles size={11} style={{ color: "var(--color-ai-accent)" }} />
        )}
        <span
          className="text-xs font-medium"
          style={{
            color:
              side === "after"
                ? "var(--color-ai-accent)"
                : "var(--color-text-muted)",
          }}
        >
          {label}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function RewriteDiffView({
  jobId,
  originalTicket,
  ticketId,
  onClose,
  onAccepted,
  onRegenerate,
}: RewriteDiffViewProps) {
  const job = useQuery(api.aiJobs.getById, { jobId });
  const acceptRewrite = useAction(api.rewriteTicket.acceptRewrite);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedRewrite, setEditedRewrite] = useState<RewriteOutput | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Parse the output when the job completes
  const parsedRewrite: RewriteOutput | null = (() => {
    if (!job?.output || job.status !== "complete") return null;
    try {
      return JSON.parse(job.output) as RewriteOutput;
    } catch {
      return null;
    }
  })();

  // Seed edit state when rewrite arrives
  useEffect(() => {
    if (parsedRewrite && !editedRewrite) {
      setEditedRewrite(parsedRewrite);
    }
  }, [parsedRewrite]);

  const displayRewrite = editMode ? editedRewrite : parsedRewrite;
  const isStreaming = job?.status === "running";
  const isFailed = job?.status === "failed";

  // The streaming buffer — raw text accumulating before JSON is parseable
  const streamingText = isStreaming ? job?.output ?? "" : "";

  const handleAccept = async () => {
    if (!displayRewrite) return;
    setIsAccepting(true);
    try {
      await acceptRewrite({ ticketId, rewrite: displayRewrite });
      setAccepted(true);
      setTimeout(() => onAccepted(), 800);
    } catch (e) {
      console.error("Accept failed:", e);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDiscard = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={handleDiscard}
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 top-0 bottom-0 z-[70] flex flex-col mx-auto overflow-hidden animate-fade-in"
        style={{
          maxWidth: "900px",
          marginLeft: "calc(var(--nav-width) + 24px)",
          marginRight: "calc(var(--ai-panel-width) + 24px)",
          marginTop: "40px",
          marginBottom: "40px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: "rgba(157, 127, 234, 0.15)" }}
            >
              <Sparkles size={13} style={{ color: "var(--color-ai-accent)" }} />
            </div>
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Ticket Rewrite
              </span>
              {parsedRewrite && (
                <div className="mt-0.5">
                  <ConfidencePill confidence={parsedRewrite.confidence} />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDiscard}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.07)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Streaming state */}
          {isStreaming && (
            <div
              className="rounded-xl p-5 space-y-3"
              style={{
                background: "rgba(157, 127, 234, 0.05)",
                border: "1px solid rgba(157, 127, 234, 0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  size={13}
                  className="animate-pulse-ai"
                  style={{ color: "var(--color-ai-accent)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-ai-accent)" }}
                >
                  Claude is rewriting…
                </span>
              </div>
              {streamingText && (
                <div
                  className="font-mono text-xs leading-relaxed overflow-hidden"
                  style={{
                    color: "var(--color-text-muted)",
                    maxHeight: "120px",
                    maskImage:
                      "linear-gradient(to bottom, black 70%, transparent 100%)",
                  }}
                >
                  {streamingText}
                  <span
                    className="inline-block w-1.5 h-3 ml-0.5 animate-pulse"
                    style={{ background: "var(--color-ai-accent)" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(242, 69, 61, 0.06)",
                border: "1px solid rgba(242, 69, 61, 0.2)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--color-danger)" }}
              >
                The rewrite failed. Please try again.
              </p>
            </div>
          )}

          {/* Success: diff view */}
          {!isStreaming && parsedRewrite && (
            <>
              {/* Title diff */}
              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Title
                </p>
                <div className="flex gap-3">
                  <DiffColumn label="Before" side="before">
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {originalTicket.title}
                    </p>
                  </DiffColumn>
                  <ChevronRight
                    size={16}
                    className="self-center flex-shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                  <DiffColumn
                    label="After"
                    side="after"
                    confidence={parsedRewrite.confidence}
                  >
                    {editMode && editedRewrite ? (
                      <input
                        value={editedRewrite.title}
                        onChange={(e) =>
                          setEditedRewrite({
                            ...editedRewrite,
                            title: e.target.value,
                          })
                        }
                        className="w-full text-sm rounded px-2 py-1"
                        style={{
                          background: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-primary)",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {parsedRewrite.title}
                      </p>
                    )}
                  </DiffColumn>
                </div>
              </div>

              {/* Description diff */}
              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Description
                </p>
                <div className="flex gap-3">
                  <DiffColumn label="Before" side="before">
                    <p
                      className="text-xs leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: originalTicket.description
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                        fontStyle: originalTicket.description
                          ? "normal"
                          : "italic",
                        minHeight: "60px",
                      }}
                    >
                      {originalTicket.description || "No description"}
                    </p>
                  </DiffColumn>
                  <ChevronRight
                    size={16}
                    className="self-center flex-shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                  <DiffColumn
                    label="After"
                    side="after"
                    confidence={parsedRewrite.confidence}
                  >
                    {editMode && editedRewrite ? (
                      <textarea
                        value={editedRewrite.description}
                        onChange={(e) =>
                          setEditedRewrite({
                            ...editedRewrite,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full text-xs leading-relaxed rounded px-2 py-1 resize-none"
                        style={{
                          background: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-primary)",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {parsedRewrite.description}
                      </p>
                    )}
                  </DiffColumn>
                </div>
              </div>

              {/* Acceptance criteria */}
              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Acceptance Criteria (AI generated)
                </p>
                <div
                  className="rounded-xl p-4 space-y-2 ai-border-solid ai-tint"
                >
                  {(editMode && editedRewrite
                    ? editedRewrite.acceptanceCriteria
                    : parsedRewrite.acceptanceCriteria
                  ).map((criterion, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check
                        size={12}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "var(--color-ai-accent)" }}
                      />
                      {editMode && editedRewrite ? (
                        <input
                          value={criterion}
                          onChange={(e) => {
                            const updated = [...editedRewrite.acceptanceCriteria];
                            updated[i] = e.target.value;
                            setEditedRewrite({
                              ...editedRewrite,
                              acceptanceCriteria: updated,
                            });
                          }}
                          className="flex-1 text-xs rounded px-2 py-0.5"
                          style={{
                            background: "var(--color-background)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-primary)",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <span
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {criterion}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimate */}
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(157, 127, 234, 0.06)",
                    border: "1px solid rgba(157, 127, 234, 0.15)",
                  }}
                >
                  <Sparkles
                    size={12}
                    style={{ color: "var(--color-ai-accent)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Suggested estimate:
                  </span>
                  {editMode && editedRewrite ? (
                    <input
                      type="number"
                      value={editedRewrite.estimatePoints}
                      onChange={(e) =>
                        setEditedRewrite({
                          ...editedRewrite,
                          estimatePoints: Number(e.target.value),
                        })
                      }
                      className="w-12 text-xs font-mono text-center rounded px-1 py-0.5"
                      style={{
                        background: "var(--color-background)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color: "var(--color-ai-accent)" }}
                    >
                      {parsedRewrite.estimatePoints} pts
                    </span>
                  )}
                </div>
              </div>

              {/* Accepted state */}
              {accepted && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{
                    background: "rgba(61, 214, 140, 0.1)",
                    border: "1px solid rgba(61, 214, 140, 0.2)",
                  }}
                >
                  <Check size={14} style={{ color: "var(--color-success)" }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--color-success)" }}
                  >
                    Rewrite accepted — ticket updated
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isStreaming && parsedRewrite && !accepted && (
          <div
            className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {/* Accept */}
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isAccepting
                  ? "rgba(61, 214, 140, 0.1)"
                  : "var(--color-success)",
                color: isAccepting ? "var(--color-success)" : "#0F1117",
                cursor: isAccepting ? "not-allowed" : "pointer",
              }}
            >
              <Check size={14} />
              {isAccepting ? "Saving…" : "Accept"}
            </button>

            {/* Edit / Done editing */}
            <button
              onClick={() => setEditMode((m) => !m)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: editMode
                  ? "rgba(110, 86, 207, 0.15)"
                  : "var(--color-background)",
                border: `1px solid ${
                  editMode
                    ? "var(--color-primary)"
                    : "var(--color-border)"
                }`,
                color: editMode
                  ? "var(--color-primary)"
                  : "var(--color-text-primary)",
              }}
            >
              <Edit3 size={14} />
              {editMode ? "Done editing" : "Edit"}
            </button>

            {/* Regenerate */}
            {onRegenerate && (
              <button
                onClick={() => {
                  onRegenerate();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-ai-accent)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(157,127,234,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-text-muted)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--color-border)";
                }}
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            )}

            {/* Discard */}
            <button
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ml-auto"
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-danger)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-danger)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-text-muted)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-border)";
              }}
            >
              <X size={14} />
              Discard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
