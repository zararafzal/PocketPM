"use client";

import { useSearchParams } from "next/navigation";
import { Plug, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

interface ConnectJiraButtonProps {
  connected?: boolean;
}

const errorMessages: Record<string, string> = {
  jira_denied: "Jira authorization was denied.",
  jira_invalid: "Invalid OAuth response from Jira.",
  jira_csrf: "Security check failed. Please try again.",
  jira_token_failed: "Could not exchange authorization code. Check your Jira app credentials.",
  jira_no_sites: "No Jira sites found on this account.",
  jira_error: "An unexpected error occurred. Check server logs.",
};

export function ConnectJiraButton({ connected }: ConnectJiraButtonProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const justConnected = searchParams.get("connected") === "1";

  if (connected) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: "rgba(61, 214, 140, 0.1)",
          border: "1px solid rgba(61, 214, 140, 0.2)",
          color: "var(--color-success)",
        }}
      >
        <CheckCircle size={12} />
        Jira Connected
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <a
        href="/api/jira/authorize"
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: "var(--color-primary)",
          color: "#fff",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#7D67D6";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--color-primary)";
        }}
      >
        <Plug size={14} />
        Connect Jira
        <ArrowRight size={14} />
      </a>

      {justConnected && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--color-success)" }}
        >
          <CheckCircle size={12} />
          Connected! Importing your projects…
        </div>
      )}

      {error && errorMessages[error] && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--color-danger)" }}
        >
          <AlertCircle size={12} />
          {errorMessages[error]}
        </div>
      )}
    </div>
  );
}
