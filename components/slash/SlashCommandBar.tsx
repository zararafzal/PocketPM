"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Command,
  CornerDownLeft,
  FileEdit,
  Sparkles,
  Wand2,
  X,
  Clock,
  Lock,
} from "lucide-react";
import { useSlashCommand } from "./SlashCommandContext";

// ─── Command registry ─────────────────────────────────────────────────────────
// Post-MVP commands are listed but marked disabled so the architecture is
// ready for iteration 7+. They appear greyed out in the palette.

const COMMANDS = [
  {
    id: "rewrite",
    trigger: "/rewrite",
    label: "Rewrite ticket",
    description:
      "Rewrite selected ticket with user story, acceptance criteria, and estimate",
    model: "Sonnet",
    estimatedTime: "~8s",
    requiresTicket: true,
    requiresProject: false,
    postMvp: false,
    icon: Wand2,
  },
  {
    id: "risks",
    trigger: "/risks",
    label: "Check sprint risks",
    description:
      "Analyse sprint for unestimated tickets, overloaded assignees, and stale work",
    model: "Haiku + Sonnet",
    estimatedTime: "~12s",
    requiresTicket: false,
    requiresProject: true,
    postMvp: false,
    icon: AlertTriangle,
  },
  {
    id: "draft",
    trigger: "/draft status update",
    label: "Draft status update",
    description:
      "Generate a three-paragraph stakeholder update from current sprint data",
    model: "Sonnet",
    estimatedTime: "~10s",
    requiresTicket: false,
    requiresProject: true,
    postMvp: false,
    icon: FileEdit,
  },
  // ── Post-MVP commands (shown, disabled) ──────────────────────────────────
  {
    id: "standup",
    trigger: "/draft standup",
    label: "Draft standup",
    description: "Generate today's daily standup summary from sprint tickets",
    model: "Haiku",
    estimatedTime: "~5s",
    requiresTicket: false,
    requiresProject: true,
    postMvp: true,
    icon: Clock,
  },
  {
    id: "estimate",
    trigger: "/estimate",
    label: "Suggest estimate",
    description: "Get a story point estimate with rationale for the selected ticket",
    model: "Haiku",
    estimatedTime: "~4s",
    requiresTicket: true,
    requiresProject: false,
    postMvp: true,
    icon: Sparkles,
  },
] as const;

type Command = (typeof COMMANDS)[number];

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, cmd: Command): boolean {
  if (!query) return true;
  const q = query.toLowerCase().replace(/^\//, "").trim();
  if (!q) return true;
  const searchable = `${cmd.trigger} ${cmd.label}`.toLowerCase().replace("/", "");
  // Check if all query characters appear in order (subsequence match)
  let qi = 0;
  for (let i = 0; i < searchable.length && qi < q.length; i++) {
    if (searchable[i] === q[qi]) qi++;
  }
  if (qi === q.length) return true;
  // Also check simple substring
  return searchable.includes(q);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlashCommandBar() {
  const { isOpen, closeBar, slashContext } = useSlashCommand();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasTicket = !!slashContext.selectedTicket;
  const hasProject = !!slashContext.projectId;

  // Filter visible commands (post-MVP always visible, just disabled)
  const filteredCommands = COMMANDS.filter((cmd) => fuzzyMatch(query, cmd));

  // Resolve disabled state per command
  function isDisabled(cmd: Command): { disabled: boolean; reason: string } {
    if (cmd.postMvp) return { disabled: true, reason: "Coming in a future update" };
    if (cmd.requiresTicket && !hasTicket)
      return { disabled: true, reason: "Open a ticket first to use this command" };
    if (cmd.requiresProject && !hasProject)
      return { disabled: true, reason: "Navigate to a project first" };
    return { disabled: false, reason: "" };
  }

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Short delay so the backdrop render doesn't swallow the focus
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Keep selection in bounds when filter changes
  useEffect(() => {
    const enabledCount = filteredCommands.filter(
      (c) => !isDisabled(c).disabled
    ).length;
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length]); // eslint-disable-line

  const executeCommand = useCallback(
    (cmd: Command) => {
      const { disabled } = isDisabled(cmd);
      if (disabled) return;
      closeBar();
      switch (cmd.id) {
        case "rewrite":
          slashContext.onRewrite?.();
          break;
        case "risks":
          slashContext.onRisks?.();
          break;
        case "draft":
          slashContext.onDraft?.();
          break;
      }
    },
    [closeBar, slashContext, hasTicket, hasProject] // eslint-disable-line
  );

  // Keyboard navigation inside the bar
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // Skip disabled entries when navigating down
        let next = selectedIndex;
        for (let i = 1; i <= filteredCommands.length; i++) {
          const idx = (selectedIndex + i) % filteredCommands.length;
          if (!isDisabled(filteredCommands[idx]).disabled) {
            next = idx;
            break;
          }
        }
        setSelectedIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        let next = selectedIndex;
        for (let i = 1; i <= filteredCommands.length; i++) {
          const idx =
            (selectedIndex - i + filteredCommands.length) %
            filteredCommands.length;
          if (!isDisabled(filteredCommands[idx]).disabled) {
            next = idx;
            break;
          }
        }
        setSelectedIndex(next);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) executeCommand(cmd);
      }
      // Escape is handled by the provider-level listener
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand]); // eslint-disable-line

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[90]"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={closeBar}
      />

      {/* ── Palette ─────────────────────────────────────────────────────── */}
      <div
        className="fixed z-[100] animate-fade-in"
        style={{
          top: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(540px, calc(100vw - 48px))",
          background: "var(--color-surface)",
          border: "1px solid rgba(157, 127, 234, 0.35)",
          borderRadius: "14px",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(157,127,234,0.08)",
          overflow: "hidden",
        }}
      >
        {/* ── Input row ───────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          {/* AI icon */}
          <div
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "rgba(157,127,234,0.15)" }}
          >
            <Sparkles size={13} style={{ color: "var(--color-ai-accent)" }} />
          </div>

          {/* Slash prefix */}
          <span
            className="font-mono text-sm flex-shrink-0"
            style={{ color: "var(--color-ai-accent)" }}
          >
            /
          </span>

          {/* Query input */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              // Strip any leading "/" the user types — we show it as prefix
              const val = e.target.value.replace(/^\/+/, "");
              setQuery(val);
              setSelectedIndex(0);
            }}
            placeholder="Type a command…  rewrite  risks  draft"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{
              color: "var(--color-text-primary)",
              caretColor: "var(--color-ai-accent)",
            }}
          />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <kbd
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              esc
            </kbd>
          </div>

          <button
            onClick={closeBar}
            className="flex-shrink-0 p-1 rounded transition-colors"
            style={{
              color: "var(--color-text-muted)",
              cursor: "pointer",
              background: "none",
              border: "none",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "var(--color-text-primary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)")
            }
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Context pill ────────────────────────────────────────────── */}
        {(hasTicket || hasProject) && (
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{
              background: "rgba(157,127,234,0.04)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Context:
            </span>
            {hasTicket ? (
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(157,127,234,0.12)",
                  color: "var(--color-ai-accent)",
                  border: "1px solid rgba(157,127,234,0.2)",
                  maxWidth: "280px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                }}
              >
                {slashContext.selectedTicket!.title.length > 40
                  ? slashContext.selectedTicket!.title.slice(0, 40) + "…"
                  : slashContext.selectedTicket!.title}
              </span>
            ) : (
              <span
                className="text-xs"
                style={{ color: "var(--color-ai-accent)" }}
              >
                Project loaded — no ticket selected
              </span>
            )}
          </div>
        )}

        {/* ── Command list ─────────────────────────────────────────────── */}
        <div className="py-1.5 max-h-[320px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                No commands match &ldquo;/{query}&rdquo;
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-muted)", opacity: 0.6 }}
              >
                Try: rewrite · risks · draft
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const { disabled, reason } = isDisabled(cmd);
              const isSelected = idx === selectedIndex && !disabled;
              const Icon = cmd.icon;

              return (
                <button
                  key={cmd.id}
                  onClick={() => !disabled && executeCommand(cmd)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all"
                  style={{
                    background: isSelected
                      ? "rgba(157,127,234,0.1)"
                      : "transparent",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.38 : 1,
                    border: "none",
                    outline: isSelected
                      ? "1px solid rgba(157,127,234,0.18)"
                      : "none",
                    outlineOffset: "-1px",
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.03)";
                    }
                    setSelectedIndex(idx);
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: isSelected
                        ? "rgba(157,127,234,0.18)"
                        : "rgba(255,255,255,0.04)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {cmd.postMvp ? (
                      <Lock
                        size={12}
                        style={{ color: "var(--color-text-muted)" }}
                      />
                    ) : (
                      <Icon
                        size={13}
                        style={{
                          color: isSelected
                            ? "var(--color-ai-accent)"
                            : "var(--color-text-muted)",
                        }}
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--color-ai-accent)" }}
                      >
                        {cmd.trigger}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {cmd.label}
                      </span>
                      {cmd.postMvp && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "rgba(139,143,154,0.12)",
                            color: "var(--color-text-muted)",
                            fontSize: "10px",
                          }}
                        >
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {disabled && reason ? reason : cmd.description}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(157,127,234,0.08)",
                        color: "var(--color-ai-accent)",
                        border: "1px solid rgba(157,127,234,0.15)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cmd.model}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cmd.estimatedTime}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{
            borderTop: "1px solid var(--color-border)",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div className="flex items-center gap-4">
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
            >
              <ArrowUp size={10} />
              <ArrowDown size={10} />
              <span className="ml-0.5">navigate</span>
            </span>
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
            >
              <CornerDownLeft size={10} />
              <span className="ml-0.5">execute</span>
            </span>
          </div>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
          >
            <Command size={10} />
            <span style={{ fontFamily: "var(--font-mono)" }}>K</span>
            <span className="ml-1">open anywhere</span>
          </div>
        </div>
      </div>
    </>
  );
}
