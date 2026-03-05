"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Activity,
  Command,
  FileEdit,
  RefreshCw,
  Ticket,
  User2,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { HealthBadge, HealthLabel } from "@/components/ui/HealthBadge";
import { BoardHealthPanel } from "./BoardHealthPanel";
import { FilterBar, TicketFilters } from "./FilterBar";
import { TicketDetailPanel } from "./TicketDetailPanel";
import { SprintRiskPanel } from "./SprintRiskPanel";
import { StatusUpdatePanel } from "./StatusUpdatePanel";
import { useSlashCommand } from "@/components/slash/SlashCommandContext";

interface ProjectPageClientProps {
  projectId: string;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProjectPageClient({ projectId }: ProjectPageClientProps) {
  const id = projectId as Id<"projects">;

  const project = useQuery(api.projects.getById, { projectId: id });
  const tickets = useQuery(api.tickets.getByProject, { projectId: id });

  const syncTickets = useAction(api.jira.syncJiraTickets);
  const analyzeRisk = useAction(api.analyzeSprintRisk.analyzeSprintRisk);
  const draftUpdate = useAction(api.draftStatusUpdate.draftStatusUpdate);

  const { setSlashContext, openBar } = useSlashCommand();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [riskJobId, setRiskJobId] = useState<Id<"aiJobs"> | null>(null);
  const [statusJobId, setStatusJobId] = useState<Id<"aiJobs"> | null>(null);
  const [checkingRisks, setCheckingRisks] = useState(false);
  const [draftingUpdate, setDraftingUpdate] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<Id<"tickets"> | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({
    search: "",
    status: "",
    assignee: "",
    priority: "",
    health: "",
  });

  // ── Stable action handlers (useCallback so refs stay accurate) ────────────
  const handleCheckRisks = useCallback(async () => {
    if (!project || checkingRisks) return;
    setCheckingRisks(true);
    setRiskError(null);
    try {
      const result = await analyzeRisk({
        projectId: id,
        workspaceId: project.workspaceId as Id<"workspaces">,
      });
      setRiskJobId(result.jobId as Id<"aiJobs">);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Risk analysis failed";
      setRiskError(
        msg.includes("USAGE_LIMIT_EXCEEDED")
          ? "Daily limit of 20 AI actions reached. Resets at midnight UTC."
          : msg
      );
    } finally {
      setCheckingRisks(false);
    }
  }, [project, id, checkingRisks, analyzeRisk]);

  const handleDraftUpdate = useCallback(async () => {
    if (!project || draftingUpdate) return;
    setDraftingUpdate(true);
    setStatusError(null);
    try {
      const result = await draftUpdate({
        projectId: id,
        workspaceId: project.workspaceId as Id<"workspaces">,
      });
      setStatusJobId(result.jobId as Id<"aiJobs">);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Draft failed";
      setStatusError(
        msg.includes("USAGE_LIMIT_EXCEEDED")
          ? "Daily limit of 20 AI actions reached. Resets at midnight UTC."
          : msg
      );
    } finally {
      setDraftingUpdate(false);
    }
  }, [project, id, draftingUpdate, draftUpdate]);

  // ── Refs so the slash bar always calls the latest handler ──────────────────
  // We write the handler into a ref each render, then register a stable wrapper
  // in setSlashContext. This avoids re-registering on every state change.
  const onRisksRef = useRef(handleCheckRisks);
  const onDraftRef = useRef(handleDraftUpdate);
  useEffect(() => { onRisksRef.current = handleCheckRisks; });
  useEffect(() => { onDraftRef.current = handleDraftUpdate; });

  // ── Register project context into the slash command bar ───────────────────
  useEffect(() => {
    if (!project) return;
    setSlashContext((prev) => ({
      ...prev,
      workspaceId: project.workspaceId as Id<"workspaces">,
      projectId: id,
      onRisks: () => onRisksRef.current(),
      onDraft: () => onDraftRef.current(),
    }));
    // Clear project context when navigating away
    return () => {
      setSlashContext((prev) => {
        const { workspaceId, projectId, onRisks, onDraft, ...rest } = prev;
        return rest;
      });
    };
  }, [project?._id, id, setSlashContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ticket selection sync ─────────────────────────────────────────────────
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncTickets({ projectId: id });
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleTicketSelect = (ticketId: string) => {
    const found = tickets?.find(
      (t) => t._id === ticketId || t.jiraId === ticketId
    );
    if (found) {
      setHighlightedTicketId(found._id);
      setFilters((f) => ({ ...f, health: "" }));
      setTimeout(() => {
        document
          .getElementById(`ticket-${found._id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    if (!tickets) return { statuses: [], assignees: [], priorities: [] };
    return {
      statuses: [...new Set(tickets.map((t) => t.status))].sort(),
      assignees: [
        ...new Set(tickets.map((t) => t.assignee).filter(Boolean)),
      ].sort() as string[],
      priorities: [
        ...new Set(tickets.map((t) => t.priority).filter(Boolean)),
      ].sort() as string[],
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !t.jiraId?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.assignee && t.assignee !== filters.assignee) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.health && t.aiHealthLabel !== filters.health) return false;
      return true;
    });
  }, [tickets, filters]);

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--color-border)",
          height: "60px",
        }}
      >
        <div>
          <h1
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {project?.name ?? "Loading…"}
          </h1>
          {project?.jiraProjectKey && (
            <p
              className="text-xs font-mono mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              {project.jiraProjectKey} ·{" "}
              {project.lastSyncedAt
                ? `synced ${formatRelativeTime(project.lastSyncedAt)}`
                : "never synced"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: syncing
                ? "var(--color-text-muted)"
                : "var(--color-text-primary)",
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync Now"}
          </button>

          {/* Draft Update */}
          <button
            onClick={handleDraftUpdate}
            disabled={draftingUpdate || !project}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(157, 127, 234, 0.08)",
              border: "1px solid rgba(157, 127, 234, 0.2)",
              color: draftingUpdate
                ? "rgba(157,127,234,0.5)"
                : "var(--color-ai-accent)",
              cursor: draftingUpdate || !project ? "not-allowed" : "pointer",
              opacity: !project ? 0.4 : 1,
            }}
          >
            <FileEdit
              size={12}
              className={draftingUpdate ? "animate-pulse" : ""}
            />
            {draftingUpdate ? "Drafting…" : "Draft Update"}
          </button>

          {/* Check Risks */}
          <button
            onClick={handleCheckRisks}
            disabled={checkingRisks || !project}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(157, 127, 234, 0.08)",
              border: "1px solid rgba(157, 127, 234, 0.2)",
              color: checkingRisks
                ? "rgba(157,127,234,0.5)"
                : "var(--color-ai-accent)",
              cursor: checkingRisks || !project ? "not-allowed" : "pointer",
              opacity: !project ? 0.4 : 1,
            }}
          >
            <Activity
              size={12}
              className={checkingRisks ? "animate-pulse" : ""}
            />
            {checkingRisks ? "Analysing…" : "Check Risks"}
          </button>

          {/* ⌘K trigger — discoverable shortcut hint */}
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

      {/* ── Error banners ────────────────────────────────────────────────── */}
      {(riskError || statusError) && (
        <div
          className="mx-6 mt-4 flex items-center justify-between px-4 py-2.5 rounded-lg text-xs"
          style={{
            background: "rgba(242, 69, 61, 0.08)",
            border: "1px solid rgba(242, 69, 61, 0.2)",
            color: "var(--color-danger)",
          }}
        >
          <span>{riskError ?? statusError}</span>
          <button
            onClick={() => {
              setRiskError(null);
              setStatusError(null);
            }}
            style={{
              color: "var(--color-danger)",
              cursor: "pointer",
              background: "none",
              border: "none",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 p-6 space-y-5">
        {/* Board Health Panel */}
        {project && tickets && (
          <BoardHealthPanel
            projectId={id}
            healthScore={project.healthScore ?? 0}
            totalTickets={project.ticketCount ?? 0}
            onTicketSelect={handleTicketSelect}
          />
        )}
        {!project && (
          <div
            className="animate-shimmer h-24 rounded-xl"
            style={{ background: "var(--color-surface)" }}
          />
        )}

        {/* Sprint Risk Panel */}
        {riskJobId && project && (
          <SprintRiskPanel
            jobId={riskJobId}
            projectId={id}
            workspaceId={project.workspaceId as Id<"workspaces">}
            onClose={() => setRiskJobId(null)}
            onRegenerate={handleCheckRisks}
            onTicketSelect={handleTicketSelect}
            isRegenerating={checkingRisks}
          />
        )}

        {/* Status Update Panel */}
        {statusJobId && project && (
          <StatusUpdatePanel
            jobId={statusJobId}
            projectName={project.name}
            onClose={() => setStatusJobId(null)}
            onRegenerate={handleDraftUpdate}
            isRegenerating={draftingUpdate}
          />
        )}

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          statuses={filterOptions.statuses}
          assignees={filterOptions.assignees}
          priorities={filterOptions.priorities}
        />

        {/* Ticket table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Column headers */}
          <div
            className="grid px-4 py-2.5 text-xs font-medium"
            style={{
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border)",
              gridTemplateColumns: "110px 1fr 130px 150px 100px 110px 60px",
            }}
          >
            <span>ID</span>
            <span>Title</span>
            <span>Status</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Health</span>
            <span className="text-right">Pts</span>
          </div>

          {/* Loading skeleton */}
          {!tickets && (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid px-4 py-3"
                  style={{
                    gridTemplateColumns:
                      "110px 1fr 130px 150px 100px 110px 60px",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div
                      key={j}
                      className="animate-shimmer h-4 rounded self-center"
                      style={{ width: j === 1 ? "75%" : "55%" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {tickets && filteredTickets.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Ticket size={32} style={{ color: "var(--color-border)" }} />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {tickets.length === 0
                  ? "No tickets yet — click Sync Now to import"
                  : "No tickets match the current filters"}
              </p>
            </div>
          )}

          {/* Ticket rows */}
          {filteredTickets.map((ticket) => {
            const isHighlighted = highlightedTicketId === ticket._id;
            return (
              <div
                id={`ticket-${ticket._id}`}
                key={ticket._id}
                className="grid px-4 py-3 transition-all cursor-pointer"
                style={{
                  gridTemplateColumns:
                    "110px 1fr 130px 150px 100px 110px 60px",
                  borderBottom: "1px solid var(--color-border)",
                  background: isHighlighted
                    ? "rgba(157, 127, 234, 0.07)"
                    : "transparent",
                  outline: isHighlighted
                    ? "1px solid rgba(157, 127, 234, 0.25)"
                    : "none",
                  outlineOffset: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isHighlighted)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
                onClick={() =>
                  setSelectedTicketId(ticket._id as Id<"tickets">)
                }
              >
                <span
                  className="font-mono text-xs self-center"
                  style={{ color: "var(--color-ai-accent)" }}
                >
                  {ticket.jiraId ?? "—"}
                </span>
                <span
                  className="text-sm self-center truncate pr-4"
                  style={{ color: "var(--color-text-primary)" }}
                  title={ticket.title}
                >
                  {ticket.title}
                </span>
                <div className="self-center">
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="flex items-center gap-1.5 self-center min-w-0">
                  {ticket.assignee ? (
                    <>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{
                          background: "rgba(110, 86, 207, 0.2)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {ticket.assignee[0].toUpperCase()}
                      </div>
                      <span
                        className="text-xs truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {ticket.assignee}
                      </span>
                    </>
                  ) : (
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <User2 size={12} />
                      Unassigned
                    </span>
                  )}
                </div>
                <div className="self-center">
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="self-center">
                  {ticket.aiHealthLabel ? (
                    <HealthBadge label={ticket.aiHealthLabel as HealthLabel} />
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      —
                    </span>
                  )}
                </div>
                <span
                  className="font-mono text-xs text-right self-center"
                  style={{
                    color: ticket.estimate
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {ticket.estimate ?? "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Filtered count */}
        {tickets && filteredTickets.length > 0 && (
          <p
            className="text-xs text-right"
            style={{ color: "var(--color-text-muted)" }}
          >
            {filteredTickets.length} of {tickets.length} tickets
          </p>
        )}
      </div>

      {/* Ticket detail panel — also registers ticket context into slash bar */}
      {selectedTicketId &&
        tickets &&
        (() => {
          const t = tickets.find((tk) => tk._id === selectedTicketId);
          if (!t) return null;
          return (
            <TicketDetailPanel
              ticket={{
                ...t,
                workspaceId: t.workspaceId as Id<"workspaces">,
              }}
              onClose={() => setSelectedTicketId(null)}
            />
          );
        })()}
    </div>
  );
}
