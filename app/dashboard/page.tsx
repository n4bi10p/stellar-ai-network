"use client";

import Link from "next/link";
import { Plus, Activity, Zap } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";

// Mock agents for now — will be replaced with real data in Level 2+
const mockAgents = [
  {
    id: "agent-alpha",
    name: "AGENT_ALPHA",
    strategy: "auto_rebalance",
    active: true,
    executions: 142,
  },
  {
    id: "agent-beta",
    name: "AGENT_BETA",
    strategy: "recurring_payment",
    active: true,
    executions: 58,
  },
  {
    id: "agent-gamma",
    name: "AGENT_GAMMA",
    strategy: "price_alert",
    active: false,
    executions: 23,
  },
];

export default function DashboardPage() {
  const { connected } = useWallet();

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                DASHBOARD // AGENT_OVERVIEW
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Manage and monitor your deployed agents
              </div>
            </div>
            <Link
              href="/agents/create"
              className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20"
            >
              <Plus className="h-3.5 w-3.5" />
              CREATE_AGENT
            </Link>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                TOTAL_AGENTS
              </div>
              <div className="mt-1 text-xl font-bold">{mockAgents.length}</div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                ACTIVE
              </div>
              <div className="mt-1 text-xl font-bold text-accent">
                {mockAgents.filter((a) => a.active).length}
              </div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                TOTAL_EXECUTIONS
              </div>
              <div className="mt-1 text-xl font-bold">
                {mockAgents.reduce((sum, a) => sum + a.executions, 0)}
              </div>
            </div>
          </div>

          {/* Agent list */}
          <div className="mt-6">
            <div className="mb-3 text-[10px] tracking-widest text-muted">
              // DEPLOYED_AGENTS
            </div>

            {!connected ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
                <div className="text-sm text-muted">
                  &gt; Connect your wallet to view agents
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {mockAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center justify-between border border-border/40 bg-surface/80 px-4 py-3 transition-colors hover:bg-surface-2/80"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded border ${
                          agent.active
                            ? "border-accent/40 text-accent"
                            : "border-border/40 text-muted"
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold tracking-wider">
                          {agent.name}
                        </div>
                        <div className="text-[10px] tracking-wider text-muted">
                          STRATEGY: {agent.strategy}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          <Activity className="h-3 w-3" />
                          {agent.executions} exec
                        </div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                          agent.active
                            ? "bg-accent/20 text-accent"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {agent.active ? "ACTIVE" : "STOPPED"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Placeholder right sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            QUICK_STATS
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Dashboard loaded</div>
          <div>&gt; {mockAgents.length} agents registered</div>
          <div>&gt; {mockAgents.filter((a) => a.active).length} currently active</div>
          <div>&gt; System nominal</div>
        </div>
      </aside>
    </HudShell>
  );
}
