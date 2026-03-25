"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Users, Wallet, BarChart3, Zap, Activity, TrendingUp } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";

interface PlatformMetrics {
  metrics: {
    totalUsers: number;
    usersWithWallet: number;
    totalAgents: number;
    runningAgents: number;
    successfulTransactions: number;
    totalExecutionAttempts: number;
    successRate: number;
    totalEvents: number;
  };
  breakdowns: {
    executionStatus: Array<{ status: string; count: number }>;
    topStrategies: Array<{ strategy: string; count: number }>;
  };
  timestamp: string;
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/internal/analytics-metrics");
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const bar = (value: number, max: number, width = 20): string => {
    if (max === 0) return "░".repeat(width);
    const filled = Math.round((value / max) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-3 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                {"PLATFORM // ANALYTICS_DASHBOARD"}
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Real-time platform metrics and user engagement
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading platform metrics...
            </div>
          ) : !data ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
              <div className="text-sm text-muted">
                &gt; Failed to load metrics
              </div>
            </div>
          ) : (
            <>
              {/* Main KPI cards */}
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> PLATFORM_METRICS"}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <Users className="h-3 w-3" /> TOTAL_USERS
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {data.metrics.totalUsers}
                    </div>
                  </div>
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <Wallet className="h-3 w-3" /> WALLET_CONNECTED
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.usersWithWallet}
                    </div>
                    <div className="mt-1 text-[10px] text-muted">
                      {data.metrics.totalUsers > 0
                        ? `${((data.metrics.usersWithWallet / data.metrics.totalUsers) * 100).toFixed(1)}%`
                        : "0%"} adoption
                    </div>
                  </div>
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <BarChart3 className="h-3 w-3" /> TOTAL_AGENTS
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.totalAgents}
                    </div>
                  </div>
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <Zap className="h-3 w-3" /> AGENTS_RUNNING
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.runningAgents}
                    </div>
                    <div className="mt-1 text-[10px] text-muted">
                      {data.metrics.totalAgents > 0
                        ? `${((data.metrics.runningAgents / data.metrics.totalAgents) * 100).toFixed(1)}%`
                        : "0%"} active
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Metrics */}
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> TRANSACTION_METRICS"}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <Activity className="h-3 w-3" /> TOTAL_ATTEMPTS
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.totalExecutionAttempts}
                    </div>
                  </div>
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <TrendingUp className="h-3 w-3" /> SUCCESSFUL
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.successfulTransactions}
                    </div>
                  </div>
                  <div className="border border-border/40 bg-surface/80 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted">
                      <BarChart3 className="h-3 w-3" /> SUCCESS_RATE
                    </div>
                    <div className="mt-1 text-2xl font-bold text-accent">
                      {data.metrics.successRate?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Status Breakdown */}
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> EXECUTION_STATUS"}
                </div>
                <div className="border border-border/40 bg-surface/80 px-5 py-4">
                  <div className="space-y-2 font-mono text-xs">
                    {data.breakdowns.executionStatus.map((item) => (
                      <div key={item.status} className="flex items-center gap-4">
                        <span className="w-12 text-[10px] tracking-wider text-accent uppercase">
                          {item.status}
                        </span>
                        <span className="text-accent">
                          {bar(item.count, Math.max(...data.breakdowns.executionStatus.map(s => s.count)))}
                        </span>
                        <span className="text-muted w-8">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Strategies */}
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> TOP_STRATEGIES"}
                </div>
                <div className="border border-border/40 bg-surface/80 px-5 py-4">
                  <div className="space-y-2 font-mono text-xs">
                    {data.breakdowns.topStrategies.map((strat, idx) => (
                      <div key={strat.strategy} className="flex items-center gap-4">
                        <span className="w-24 truncate text-[10px] tracking-wider text-muted">
                          {idx + 1}. {strat.strategy.replace(/_/g, " ")}
                        </span>
                        <span className="text-accent">
                          {bar(strat.count, Math.max(...data.breakdowns.topStrategies.map(s => s.count)), 15)}
                        </span>
                        <span className="text-muted">{strat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border border-border/40 bg-surface/80 px-5 py-4">
                <div className="text-[10px] tracking-widest text-muted mb-3">SUMMARY</div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono text-[10px] text-muted">
                  <div>
                    <div className="text-muted mb-1">Total Events</div>
                    <div className="text-lg font-bold text-accent">{data.metrics.totalEvents}</div>
                  </div>
                  <div>
                    <div className="text-muted mb-1">Agents/User</div>
                    <div className="text-lg font-bold text-accent">
                      {(data.metrics.totalAgents / Math.max(data.metrics.totalUsers, 1)).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted mb-1">Executions/Agent</div>
                    <div className="text-lg font-bold text-accent">
                      {(data.metrics.totalExecutionAttempts / Math.max(data.metrics.totalAgents, 1)).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted mb-1">Last Updated</div>
                    <div className="text-xs text-accent">
                      {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </HudShell>
  );
}
