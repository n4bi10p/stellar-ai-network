"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Store,
  BarChart3,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useWallet } from "@/lib/hooks/useWallet";
import { truncateAddress, formatXLM } from "@/lib/utils/formatting";
import { APP_VERSION } from "@/lib/utils/constants";

const navItems = [
  { label: "./dashboard", href: "/", icon: LayoutGrid },
  { label: "./agents", href: "/agents", icon: Users },
  { label: "./marketplace", href: "/marketplace", icon: Store },
  { label: "./analytics", href: "/analytics", icon: BarChart3 },
];

export function HudShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, address, balance } = useWallet();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-[family-name:var(--font-geist-mono)]">
      {/* ─── Top Status Bar ─── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-surface px-4 py-1.5 text-[11px] tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            STELLAR_OS V{APP_VERSION}
          </span>
          <span className="text-muted">|</span>
          <span className="text-muted">MEM_ALLOC: 45MB / 128MB</span>
          <span className="text-muted">CPU_LOAD: 0.12, 0.08, 0.04</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted">SERVER: US-EAST-1</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-accent" : "bg-red-500"
              }`}
            />
            <span className={connected ? "text-accent" : "text-red-400"}>
              {connected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </span>
          <span className="text-muted">UTF-8</span>
        </div>
      </header>

      {/* ─── Content: Sidebar | Main | Right Panel ─── */}
      <div className="flex min-h-0 flex-1">
        {/* ─── Left Sidebar ─── */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-border/60 bg-surface">
          <div className="border-b border-border/40 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-widest">
              <span className="text-accent">✦</span> STELLAR_AI
            </div>
            <div className="mt-1.5 text-[10px] tracking-wider text-muted">
              &gt; INITIALIZING NETWORK... OK
            </div>
          </div>

          <div className="flex-1 px-3 py-3">
            <div className="mb-2 px-1 text-[10px] tracking-widest text-muted">
              {"// NAVIGATION"}
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs tracking-wider transition-colors ${
                      isActive
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border/40 px-3 py-2">
            <Link
              href="/config"
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs tracking-wider text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              ./config
            </Link>
          </div>

          <div className="border-t border-border/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-[10px] font-bold">
                {connected ? address.slice(1, 3) : "??"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold tracking-wider">
                  {connected ? truncateAddress(address) : "NOT_CONNECTED"}
                </div>
                <div className="text-[10px] tracking-wider text-muted">
                  {connected ? (
                    <>
                      BAL: <span className="text-accent">{formatXLM(balance)} XLM</span>
                    </>
                  ) : (
                    "WALLET: OFFLINE"
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        {children}
      </div>

      {/* ─── Bottom Status Bar (vim-style) ─── */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border/60 bg-surface px-4 py-1 text-[11px] tracking-wider text-muted">
        <span>MODE: VISUAL &nbsp;&nbsp;-- INSERT --</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span>Ln 42, Col 18 &nbsp;100%</span>
        </div>
      </footer>
    </div>
  );
}
