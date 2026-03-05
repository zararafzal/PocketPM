"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Clock,
  ExternalLink,
  Command,
} from "lucide-react";
import { ConnectJiraButton } from "./ConnectJiraButton";
import { healthChipColor, healthChipLabel } from "@/convex/lib/healthScorer";
import { useState } from "react";
import { useSlashCommand } from "@/components/slash/SlashCommandContext";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function HealthChip({ score }: { score: number }) {
  const color = healthChipColor(score);
  const label = score > 0 ? `${score}` : "—";
  return (
    <span className="font-mono text-xs font-medium" style={{ color }}>
      {label}
    </span>
  );
}

export function DashboardClient() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { openBar } = useSlashCommand();

  const userData = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );
  const workspace = userData?.workspace;
  const workspaceId = workspace?._id as Id<"workspaces"> | undefined;

  const projects = useQuery(
    api.projects.getByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );

  const syncProjects = useAction(api.jira.syncJiraProjects);
  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = async () => {
    if (!clerkId || syncing) return;
    setSyncing(true);
    try {
      await syncProjects({ clerkId });
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  const avgHealth =
    projects && projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + p.healthScore, 0) / projects.length
        )
      : 0;

  const stats = [
    {
      label: "Projects",
      value: projects ? String(projects.length) : "—",
      icon: FolderKanban,
      color: "var(--color-primary)",
    },
    {
      label: "Avg Board Health",
      value: avgHealth > 0 ? `${avgHealth}` : "—",
      icon: TrendingUp,
      color: "var(--color-success)",
    },
    {
      label: "Active Risks",
      value: "—",
      icon: AlertTriangle,
      color: "var(--color-warning)",
    },
    {
      label: "AI Actions Today",
      value: `${workspace?.aiActionsToday ?? 0} / 20`,
      icon: Sparkles,
      color: "var(--color-ai-accent)",
    },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                {label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <span
              className="text-2xl font-semibold tracking-tight font-mono"
              style={{ color: "var(--color-text-primary)" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Jira connection / project list */}
      {!workspace?.jiraConnected ? (
        // ── Not connected ──────────────────────────────────────────────────
        <div
          className="rounded-2xl p-10 flex flex-col items-center text-center gap-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(110, 86, 207, 0.12)",
              border: "1px solid rgba(110, 86, 207, 0.25)",
            }}
          >
            <FolderKanban size={26} style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Connect your Jira workspace
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Import all your projects and tickets in under 2 minutes. The AI
              scores ticket health instantly on import.
            </p>
          </div>
          <ConnectJiraButton connected={false} />
        </div>
      ) : (
        // ── Connected: project list ────────────────────────────────────────
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Table header row */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {projects?.length ?? 0} project
              {projects?.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <ConnectJiraButton connected={true} />
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  color: syncing
                    ? "var(--color-text-muted)"
                    : "var(--color-text-primary)",
                  cursor: syncing ? "not-allowed" : "pointer",
                }}
              >
                <RefreshCw
                  size={12}
                  className={syncing ? "animate-spin" : ""}
                />
                {syncing ? "Syncing…" : "Sync All"}
              </button>
              {/* ⌘K — discoverable shortcut hint */}
              <button
                onClick={openBar}
                title="Open AI command bar (⌘K)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: "rgba(157,127,234,0.06)",
                  border: "1px solid rgba(157,127,234,0.18)",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-ai-accent)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(157,127,234,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-text-muted)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(157,127,234,0.18)";
                }}
              >
                <Command size={11} />
                <span style={{ fontFamily: "var(--font-mono)" }}>K</span>
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div
            className="grid px-4 py-2.5 text-xs font-medium"
            style={{
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border)",
              gridTemplateColumns: "1fr 80px 80px 80px 130px",
            }}
          >
            <span>Project</span>
            <span>Key</span>
            <span>Tickets</span>
            <span>Health</span>
            <span>Last synced</span>
          </div>

          {/* Project rows */}
          {!projects || projects.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="animate-shimmer w-48 h-4 rounded" />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {syncing ? "Importing projects…" : "No projects found"}
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="grid px-4 py-3 transition-colors group"
                style={{
                  gridTemplateColumns: "1fr 80px 80px 80px 130px",
                  borderBottom: "1px solid var(--color-border)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {project.name}
                  </span>
                  <ExternalLink
                    size={11}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                </div>

                {/* Key */}
                <span
                  className="font-mono text-xs self-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {project.jiraProjectKey}
                </span>

                {/* Ticket count */}
                <span
                  className="font-mono text-sm self-center"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {project.ticketCount}
                </span>

                {/* Health score */}
                <span className="self-center">
                  <HealthChip score={project.healthScore} />
                </span>

                {/* Last synced */}
                <div className="flex items-center gap-1 self-center">
                  <Clock size={11} style={{ color: "var(--color-text-muted)" }} />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {project.lastSyncedAt
                      ? formatRelativeTime(project.lastSyncedAt)
                      : "Never"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
