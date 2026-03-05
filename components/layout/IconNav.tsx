"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Settings,
  HelpCircle,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
];

const bottomItems = [
  { href: "/help", icon: HelpCircle, label: "Help" },
];

export function IconNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed left-0 top-0 h-full flex flex-col items-center py-4 z-50"
      style={{
        width: "var(--nav-width)",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* Logo / Brand mark */}
      <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-xl"
        style={{ background: "var(--color-primary)" }}>
        <Sparkles size={18} color="#fff" />
      </div>

      {/* Main nav */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150"
            style={{
              color: isActive(href)
                ? "var(--color-ai-accent)"
                : "var(--color-text-muted)",
              background: isActive(href)
                ? "rgba(157, 127, 234, 0.12)"
                : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-text-muted)";
              }
            }}
          >
            <Icon size={18} />
            {/* Tooltip */}
            <span
              className="absolute left-14 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                zIndex: 100,
              }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        {bottomItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            <Icon size={18} />
          </Link>
        ))}

        {/* Clerk UserButton */}
        <div className="w-8 h-8 flex items-center justify-center">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: {
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                },
              },
            }}
          />
        </div>
      </div>
    </nav>
  );
}
