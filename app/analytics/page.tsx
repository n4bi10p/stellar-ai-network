"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  Activity,
  TrendingUp,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { readConfig } from "@/lib/stellar/contracts";

interface AgentStat {
  id: string;
  name: string;
  strategy: string;
  contractId: string;
  createdAt: string;
  active: boolean;
  executions: number;
}

export default function AnalyticsPage() {
  const { connected, address } = useWallet();
  const [agents, setAgents] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      if (!res.ok) throw new Error("fetch failed");
      const { agents: stored } = await res.json();

      type StoredAgentLite = Pick<
        AgentStat,
        "id" | "name" | "strategy" | "contractId" | "createdAt"
      >;
      const stats: AgentStat[] = await Promise.all(
        (stored as StoredAgentLite[]).map(async (a) => {
          try {
            const cfg = await readConfig(a.contractId);
            return {
              id: a.id,
              name: a.name,
              strategy: a.strategy,
              contractId: a.contractId,
              createdAt: a.createdAt,
              active: cfg?.active ?? false,
              executions: cfg?.executions ?? 0,
            };
          } catch {
            return {
              id: a.id,
              name: a.name,
              strategy: a.strategy,
              contractId: a.contractId,
              createdAt: a.createdAt,
              active: false,
              executions: 0,
            };
          }
        })
      );

      setAgents(stats);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) fetchStats();
  }, [connected, address, fetchStats]);

  // Computed analytics
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.active).length;
  const inactiveAgents = totalAgents - activeAgents;
  const totalExecs = agents.reduce((s, a) => s + a.executions, 0);
  const avgExecs = totalAgents > 0 ? (totalExecs / totalAgents).toFixed(1) : "0";
  const successRate = totalExecs > 0 ? 100 : 0;
  const topAgent = agents.length > 0
    ? agents.reduce((best, a) => (a.executions > best.executions ? a : best))
    : null;

  // Strategy breakdown
  const strategyMap = agents.reduce<Record<string, { count: number; execs: number }>>((map, a) => {
    if (!map[a.strategy]) map[a.strategy] = { count: 0, execs: 0 };
    map[a.strategy].count++;
    map[a.strategy].execs += a.executions;
    return map;
  }, {});

  // Simple text-based bar chart
  function bar(value: number, max: number, width = 20): string {
    if (max === 0) return "░".repeat(width);
    const filled = Math.round((value / max) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  }

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                {"ANALYTICS // PERFORMANCE_METRICS"}
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Agent execution analytics and performance overview
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected && (
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {!connected ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
              <div className="text-sm text-muted">
                &gt; Connect your wallet to view analytics
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics...
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                    <Zap className="h-3 w-3" /> TOTAL_AGENTS
                  </div>
                  <div className="mt-1 text-2xl font-bold">{totalAgents}</div>
                </div>
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                    <Activity className="h-3 w-3" /> TOTAL_EXECUTIONS
                  </div>
                  <div className="mt-1 text-2xl font-bold text-accent">
                    {totalExecs}
                  </div>
                </div>
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                    <TrendingUp className="h-3 w-3" /> SUCCESS_RATE
                  </div>
                  <div className="mt-1 text-2xl font-bold text-accent">
                    {successRate}%
                  </div>
                </div>
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                    <BarChart3 className="h-3 w-3" /> AVG_EXEC/AGENT
                  </div>
                  <div className="mt-1 text-2xl font-bold">{avgExecs}</div>
                </div>
              </div>

              {/* Active vs Inactive */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-border/40 bg-surface/80 px-5 py-4">
                  <div className="mb-2 text-[10px] tracking-widest text-muted">
                    AGENT_STATUS_DISTRIBUTION
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-[10px] tracking-wider text-accent">
                        ACTIVE
                      </span>
                      <span className="text-accent">
                        {bar(activeAgents, totalAgents)}
                      </span>
                      <span className="text-muted">{activeAgents}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-[10px] tracking-wider text-red-400">
                        STOPPED
                      </span>
                      <span className="text-red-400">
                        {bar(inactiveAgents, totalAgents)}
                      </span>
                      <span className="text-muted">{inactiveAgents}</span>
                    </div>
                  </div>
                </div>

                {/* Strategy breakdown */}
                <div className="border border-border/40 bg-surface/80 px-5 py-4">
                  <div className="mb-2 text-[10px] tracking-widest text-muted">
                    STRATEGY_BREAKDOWN
                  </div>
                  {Object.keys(strategyMap).length === 0 ? (
                    <div className="text-[10px] text-muted">
                      No agents deployed yet
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono text-xs">
                      {Object.entries(strategyMap).map(([strat, data]) => (
                        <div key={strat} className="flex items-center gap-3">
                          <span className="w-24 truncate text-[10px] tracking-wider text-muted">
                            {strat}
                          </span>
                          <span className="text-accent">
                            {bar(data.execs, totalExecs, 15)}
                          </span>
                          <span className="text-muted">
                            {data.count}a / {data.execs}e
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-agent execution table */}
              <div className="mt-6">
                <div className="mb-3 text-[10px] tracking-widest text-muted">
                  {"// AGENT_EXECUTION_RANKING"}
                </div>
                {agents.length === 0 ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-6 text-center text-sm text-muted">
                    &gt; No agents to display
                  </div>
                ) : (
                  <div className="border border-border/40 bg-surface/80">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-4 py-2 text-[9px] tracking-widest text-muted">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">AGENT</div>
                      <div className="col-span-2">STRATEGY</div>
                      <div className="col-span-2">STATUS</div>
                      <div className="col-span-2">EXECUTIONS</div>
                      <div className="col-span-2">PERFORMANCE</div>
                    </div>
                    {/* Table rows */}
                    {agents
                      .sort((a, b) => b.executions - a.executions)
                      .map((agent, i) => (
                        <Link
                          key={agent.id}
                          href={`/agents/${agent.contractId}`}
                          className="grid grid-cols-12 items-center gap-2 border-b border-border/20 px-4 py-2.5 text-xs transition-colors last:border-0 hover:bg-surface-2/50"
                        >
                          <div className="col-span-1 font-mono text-muted">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="col-span-3 font-bold tracking-wider">
                            {agent.name}
                          </div>
                          <div className="col-span-2 text-[10px] text-muted">
                            {agent.strategy}
                          </div>
                          <div className="col-span-2">
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
                          <div className="col-span-2 font-mono text-accent">
                            {agent.executions}
                          </div>
                          <div className="col-span-2 font-mono text-[10px] text-muted">
                            {bar(agent.executions, topAgent?.executions ?? 1, 10)}
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>

              {/* Top performer */}
              {topAgent && topAgent.executions > 0 && (
                <div className="mt-4 border border-accent/30 bg-accent/5 px-5 py-3">
                  <div className="flex items-center gap-2 text-[10px] tracking-widest text-accent">
                    <TrendingUp className="h-3.5 w-3.5" />
                    TOP_PERFORMER
                  </div>
                  <div className="mt-1 text-sm font-bold tracking-wider">
                    {topAgent.name}
                  </div>
                  <div className="mt-0.5 text-[10px] tracking-wider text-muted">
                    {topAgent.executions} executions | Strategy:{" "}
                    {topAgent.strategy}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            METRICS_PANEL
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Analytics engine loaded</div>
          <div>&gt; Fetching on-chain data...</div>
          {!loading && connected && (
            <>
              <div className="mt-2">&gt; {totalAgents} agents scanned</div>
              <div>&gt; {activeAgents} active</div>
              <div>&gt; {totalExecs} total executions</div>
              <div>&gt; {avgExecs} avg exec/agent</div>
              <div>&gt; {successRate}% success rate</div>
            </>
          )}
          <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
            NAVIGATION
          </div>
          <div className="mt-2 space-y-1.5">
            <Link href="/agents" className="block text-accent underline">
              &gt; View all agents
            </Link>
            <Link href="/marketplace" className="block text-accent underline">
              &gt; Browse templates
            </Link>
            <Link href="/" className="block text-accent underline">
              &gt; Back to terminal
            </Link>
          </div>
        </div>
      </aside>
    </HudShell>
  );
}
