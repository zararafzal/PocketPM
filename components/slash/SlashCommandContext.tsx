"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Id } from "@/convex/_generated/dataModel";

// ─── Shared context shape ─────────────────────────────────────────────────────
// Pages and panels write into this; the bar reads from it.

export interface SlashContext {
  workspaceId?: Id<"workspaces">;
  projectId?: Id<"projects">;
  selectedTicket?: {
    _id: Id<"tickets">;
    title: string;
    workspaceId: Id<"workspaces">;
  };
  /** Handlers injected by the relevant page/panel */
  onRewrite?: () => void;
  onRisks?: () => void;
  onDraft?: () => void;
}

interface SlashCommandContextValue {
  isOpen: boolean;
  openBar: () => void;
  closeBar: () => void;
  slashContext: SlashContext;
  /**
   * Accepts either a full replacement object or a functional updater.
   * Use the functional form to merge partial updates without clobbering
   * context set by other components:
   *   setSlashContext(prev => ({ ...prev, selectedTicket: … }))
   */
  setSlashContext: (
    ctx: SlashContext | ((prev: SlashContext) => SlashContext)
  ) => void;
}

export const SlashCommandContext = createContext<SlashCommandContextValue>({
  isOpen: false,
  openBar: () => {},
  closeBar: () => {},
  slashContext: {},
  setSlashContext: () => {},
});

export function useSlashCommand() {
  return useContext(SlashCommandContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SlashCommandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [slashContext, setSlashContextState] = useState<SlashContext>({});

  const setSlashContext = useCallback(
    (ctx: SlashContext | ((prev: SlashContext) => SlashContext)) => {
      // useState setter already accepts functional updaters natively
      setSlashContextState(ctx as Parameters<typeof setSlashContextState>[0]);
    },
    []
  );

  const openBar = useCallback(() => setIsOpen(true), []);
  const closeBar = useCallback(() => setIsOpen(false), []);

  // ── Global keyboard listeners ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — open from anywhere
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // "/" — open when no text input is focused
      if (e.key === "/" && !isOpen) {
        const target = e.target as HTMLElement;
        const isTextInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isTextInput) {
          e.preventDefault();
          setIsOpen(true);
        }
      }

      // Escape — close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <SlashCommandContext.Provider
      value={{ isOpen, openBar, closeBar, slashContext, setSlashContext }}
    >
      {children}
    </SlashCommandContext.Provider>
  );
}
