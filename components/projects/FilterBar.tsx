"use client";

import { Search, X } from "lucide-react";

export interface TicketFilters {
  search: string;
  status: string;
  assignee: string;
  priority: string;
  health: string;
}

interface FilterBarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  statuses: string[];
  assignees: string[];
  priorities: string[];
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs rounded-lg px-3 py-1.5 appearance-none cursor-pointer transition-colors"
      style={{
        background: value ? "rgba(110, 86, 207, 0.1)" : "var(--color-background)",
        border: `1px solid ${value ? "var(--color-primary)" : "var(--color-border)"}`,
        color: value ? "var(--color-text-primary)" : "var(--color-text-muted)",
        outline: "none",
        minWidth: "110px",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ background: "#1C1F26" }}>
          {opt}
        </option>
      ))}
    </select>
  );
}

const PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];
const HEALTH_OPTIONS = [
  { value: "complete", label: "Complete" },
  { value: "needs_work", label: "Needs Work" },
  { value: "broken", label: "Broken" },
];

export function FilterBar({
  filters,
  onFiltersChange,
  statuses,
  assignees,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.search || filters.status || filters.assignee || filters.priority || filters.health;

  const clear = () =>
    onFiltersChange({ search: "", status: "", assignee: "", priority: "", health: "" });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search tickets…"
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="text-xs rounded-lg pl-8 pr-3 py-1.5 w-48 transition-colors"
          style={{
            background: "var(--color-background)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        />
      </div>

      <FilterSelect
        value={filters.status}
        onChange={(v) => onFiltersChange({ ...filters, status: v })}
        options={statuses}
        placeholder="All statuses"
      />

      <FilterSelect
        value={filters.assignee}
        onChange={(v) => onFiltersChange({ ...filters, assignee: v })}
        options={assignees}
        placeholder="All assignees"
      />

      <FilterSelect
        value={filters.priority}
        onChange={(v) => onFiltersChange({ ...filters, priority: v })}
        options={PRIORITIES}
        placeholder="All priorities"
      />

      <select
        value={filters.health}
        onChange={(e) => onFiltersChange({ ...filters, health: e.target.value })}
        className="text-xs rounded-lg px-3 py-1.5 appearance-none cursor-pointer transition-colors"
        style={{
          background: filters.health
            ? filters.health === "complete"
              ? "rgba(61, 214, 140, 0.1)"
              : filters.health === "needs_work"
              ? "rgba(245, 166, 35, 0.1)"
              : "rgba(242, 69, 61, 0.1)"
            : "var(--color-background)",
          border: `1px solid ${
            filters.health
              ? filters.health === "complete"
                ? "var(--color-success)"
                : filters.health === "needs_work"
                ? "var(--color-warning)"
                : "var(--color-danger)"
              : "var(--color-border)"
          }`,
          color: filters.health
            ? "var(--color-text-primary)"
            : "var(--color-text-muted)",
          outline: "none",
          minWidth: "110px",
        }}
      >
        <option value="">All health</option>
        {HEALTH_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value} style={{ background: "#1C1F26" }}>
            {label}
          </option>
        ))}
      </select>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors"
          style={{
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
          }}
        >
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  );
}
