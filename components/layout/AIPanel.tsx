"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkles, Zap, CheckCircle2, XCircle, Clock } from "lucide-react";

interface AIPanelProps {
  context?: "dashboard" | "project" | "ticket";
  workspaceId?: Id<"workspaces">;
}

const JOB_TYPE_LABEL: Record<string, string> = {
  rewrite_ticket: "Ticket rewrite",
  sprint_risk: "Sprint risk",
  status_update: "Status update",
  embed_ticket: "Embedding",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function AIPanel({ context = "dashboard", workspaceId }: AIPanelProps) {
  const usage = useQuery(
    api.aiUsage.getTodayUsage,
    workspaceId ? { workspaceId } : "skip"
  );
  const recentJobs = useQuery(
    api.aiJobs.getRecent,
    workspaceId ? { workspaceId, limit: 5 } : "skip"
  );

  const actionCount = usage?.actionCount ?? 0;
  const cap = usage?.cap ?? 20;
  const usagePct = Math.min((actionCount / cap) * 100, 100);

  const usageColor =
    usagePct >= 90
      ? "var(--color-danger)"
      : usagePct >= 70
      ? "var(--color-warning)"
      : "var(--color-ai-accent)";

  return (
    <aside
      className="fixed right-0 top-0 h-full flex flex-col"
      style={{
        width: "var(--ai-panel-width)",
        background: "var(--color-surface)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md"
          style={{ background: "rgba(157, 127, 234, 0.15)" }}
        >
          <Sparkles size={13} style={{ color: "var(--color-ai-accent)" }} />
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          AI Copilot
        </span>
        <div
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
          style={{
            background: "rgba(157, 127, 234, 0.1)",
            color: "var(--color-ai-accent)",
            border: "1px solid rgba(157, 127, 234, 0.2)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-ai" />
          Ready
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Command hints */}
        <div className="px-4 pt-4 pb-2">
          <p
            className="text-xs font-medium mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            {context === "project"
              ? "Click any ticket to open it, then:"
              : "Available actions"}
          </p>
          <div className="space-y-1.5">
            {[
              { cmd: "/rewrite", model: "Sonnet", desc: "Rewrite selected ticket" },
              { cmd: "/risks", model: "Haiku+Sonnet", desc: "Sprint risk analysis" },
              { cmd: "/draft status update", model: "Sonnet", desc: "Draft stakeholder update" },
            ].map(({ cmd, model, desc }) => (
              <div
                key={cmd}
                className="flex flex-col gap-0.5 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--color-ai-accent)" }}
                  >
                    {cmd}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {model}
                  </span>
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent jobs */}
        {recentJobs && recentJobs.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <p
              className="text-xs font-medium mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Recent activity
            </p>
            <div className="space-y-1.5">
              {recentJobs.map((job) => (
                <div
                  key={job._id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {job.status === "complete" ? (
                    <CheckCircle2
                      size={12}
                      style={{ color: "var(--color-success)", flexShrink: 0 }}
                    />
                  ) : job.status === "failed" ? (
                    <XCircle
                      size={12}
                      style={{ color: "var(--color-danger)", flexShrink: 0 }}
                    />
                  ) : (
                    <Sparkles
                      size={12}
                      className="animate-pulse-ai"
                      style={{ color: "var(--color-ai-accent)", flexShrink: 0 }}
                    />
                  )}
                  <span
                    className="text-xs flex-1 truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {JOB_TYPE_LABEL[job.type] ?? job.type}
                  </span>
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {formatTime(job.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!recentJobs || recentJobs.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(157, 127, 234, 0.08)",
                border: "1px solid rgba(157, 127, 234, 0.15)",
              }}
            >
              <Zap size={18} style={{ color: "var(--color-ai-accent)" }} />
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              {context === "dashboard"
                ? "Connect Jira to activate the AI copilot"
                : "Click a ticket row to open it and run AI actions"}
            </p>
          </div>
        )}
      </div>

      {/* Footer — live usage counter */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-xs font-mono"
            style={{ color: "var(--color-text-muted)" }}
          >
            AI actions today
          </span>
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: usageColor }}
          >
            {actionCount} / {cap}
          </span>
        </div>
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: "var(--color-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usagePct}%`, background: usageColor }}
          />
        </div>
        {usagePct >= 90 && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-warning)" }}
          >
            Almost at limit — resets midnight UTC
          </p>
        )}
      </div>
    </aside>
  );
}
