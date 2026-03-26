"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap, ExternalLink } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";

interface ActivityLog {
  id: string;
  agentId: string;
  status: "success" | "failed" | "pending";
  txHash: string | null;
  errorMsg: string | null;
  metadata: any;
  createdAt: string;
  transactionType: string;
  timestamp: string;
}

interface ActivitySummary {
  totalTransactions: number;
  successful: number;
  failed: number;
  pending: number;
  byType: {
    agent_execution: number;
    manual_transfer: number;
    manual_soroban: number;
  };
}

export default function ActivityLogPage() {
  const { connected, address } = useWallet();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed" | "pending">("all");
  const [filterType, setFilterType] = useState<"all" | "agent_execution" | "manual_transfer" | "manual_soroban">("all");
  const [hasFetched, setHasFetched] = useState(false);
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);

  // Load from localStorage when address becomes available (after wallet rehydration)
  useEffect(() => {
    console.log("[ActivityLog] CACHE_LOAD_EFFECT: address=", address?.slice(0, 8), "hasLoadedFromCache=", hasLoadedFromCache);
    
    if (!address) {
      console.log("[ActivityLog] No address yet, clearing state");
      setActivities([]);
      setSummary(null);
      setHasLoadedFromCache(false);
      return;
    }

    // Only load cache once per address
    if (hasLoadedFromCache) {
      console.log("[ActivityLog] Cache already loaded for", address?.slice(0, 8));
      return;
    }

    const cacheKey = `activity_${address}`;
    console.log("[ActivityLog] Loading from cache key:", cacheKey);
    
    const cached = localStorage.getItem(cacheKey);
    console.log("[ActivityLog] Cache exists:", !!cached);
    
    if (cached) {
      try {
        const { activities: cachedActivities, summary: cachedSummary } = JSON.parse(cached);
        setActivities(cachedActivities || []);
        setSummary(cachedSummary || null);
        console.log("[ActivityLog] ✓ Loaded from localStorage:", cachedActivities?.length || 0, "activities");
        setHasLoadedFromCache(true);
      } catch (err) {
        console.warn("[ActivityLog] Failed to parse cached data:", err);
        setActivities([]);
        setSummary(null);
        setHasLoadedFromCache(true);
      }
    } else {
      console.log("[ActivityLog] No cache found, will fetch from API");
      setActivities([]);
      setSummary(null);
      setHasLoadedFromCache(true);
    }
  }, [address, hasLoadedFromCache]); // Re-run when wallet rehydrates with address

  const fetchActivity = useCallback(async () => {
    if (!address) {
      console.log("[ActivityLog] No address, skipping fetch");
      return;
    }
    
    setLoading(true);
    console.log("[ActivityLog] FETCH START: Fetching activities for", address?.slice(0, 8));
    
    try {
      let url = `/api/execution-activity?owner=${address}&limit=100`;
      if (filterStatus !== "all") url += `&status=${filterStatus}`;

      console.log("[ActivityLog] API URL:", url);
      const res = await fetch(url);
      console.log("[ActivityLog] API Response status:", res.status);
      
      if (!res.ok) throw new Error("Failed to fetch activity");
      const data = await res.json();
      
      console.log("[ActivityLog] API Returned:", {
        activitiesCount: data.activities?.length || 0,
        total: data.total,
        summary: data.summary,
      });
      
      setActivities(data.activities || []);
      setSummary(data.summary);

      // Save to localStorage
      localStorage.setItem(
        `activity_${address}`,
        JSON.stringify({
          activities: data.activities,
          summary: data.summary,
          timestamp: new Date().toISOString(),
        })
      );
      console.log("[ActivityLog] ✓ Synced and saved to localStorage");
    } catch (err) {
      console.error("[ActivityLog] FETCH ERROR:", err);
      // Try to fall back to cache if fetch fails
      const cached = localStorage.getItem(`activity_${address}`);
      if (cached) {
        try {
          const { activities: cachedActivities, summary: cachedSummary } = JSON.parse(cached);
          setActivities(cachedActivities || []);
          setSummary(cachedSummary || null);
          console.warn("[ActivityLog] Fetch failed, reverted to cache");
        } catch (e) {
          console.warn("[ActivityLog] Fetch failed and cache invalid");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [address, filterStatus]);

  // Fetch fresh data when cache is loaded and address is ready
  useEffect(() => {
    console.log("[ActivityLog] FETCH_EFFECT: address=", address?.slice(0, 8), "connected=", connected, "hasLoadedFromCache=", hasLoadedFromCache, "hasFetched=", hasFetched);
    
    if (!connected || !address) {
      console.log("[ActivityLog] Not connected or no address, skipping fetch");
      setHasFetched(false);
      return;
    }

    // Clean up old caches to prevent storage bloat
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("activity_") && key !== `activity_${address}`) {
          console.log("[ActivityLog] Cleaning up old cache:", key);
          localStorage.removeItem(key);
        }
      });
    }

    // Only fetch after cache is loaded (to avoid unnecessary requests if cache exists)
    if (hasLoadedFromCache && !hasFetched) {
      console.log("[ActivityLog] Cache loaded, now fetching latest data for", address?.slice(0, 8));
      fetchActivity();
      setHasFetched(true);
    } else if (!hasLoadedFromCache) {
      console.log("[ActivityLog] Waiting for cache to load...");
    } else if (hasFetched) {
      console.log("[ActivityLog] Already fetched, skipping");
    }
  }, [address, connected, fetchActivity, hasLoadedFromCache, hasFetched]);

  const filteredActivities = filterType === "all" 
    ? activities 
    : activities.filter(a => a.transactionType === filterType);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-accent bg-accent/20";
      case "failed":
        return "text-red-400 bg-red-500/20";
      case "pending":
        return "text-yellow-500 bg-yellow-500/20";
      default:
        return "text-muted";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "agent_execution":
        return "Agent Execution";
      case "manual_transfer":
        return "Manual Transfer";
      case "manual_soroban":
        return "Manual Soroban";
      default:
        return "Unknown";
    }
  };

  const txExplorerUrl = (hash: string) =>
    `https://stellar.expert/explorer/testnet/tx/${hash}`;

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-3 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                {"ACTIVITY // TRANSACTION_LOG"}
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; All manual transactions, agent executions, and Soroban operations
              </div>
            </div>
            <button
              onClick={fetchActivity}
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
          {!connected ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
              <div className="text-sm text-muted">&gt; Connect wallet to view activity</div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {summary && (
                <div className="mb-6">
                  <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                    {">> ACTIVITY_SUMMARY"}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">TOTAL</div>
                      <div className="mt-1 text-xl font-bold text-accent">
                        {summary.totalTransactions}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">SUCCESS</div>
                      <div className="mt-1 text-xl font-bold text-accent">
                        {summary.successful}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">FAILED</div>
                      <div className="mt-1 text-xl font-bold text-red-400">
                        {summary.failed}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">PENDING</div>
                      <div className="mt-1 text-xl font-bold text-yellow-500">
                        {summary.pending}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">AGENTS</div>
                      <div className="mt-1 text-xl font-bold">
                        {summary.byType.agent_execution}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Type Breakdown */}
              {summary && (
                <div className="mb-6">
                  <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                    {">> TRANSACTION_TYPES"}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">Agent Execution</div>
                      <div className="mt-1 text-lg font-bold text-accent">
                        {summary.byType.agent_execution}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">Manual Transfer</div>
                      <div className="mt-1 text-lg font-bold">
                        {summary.byType.manual_transfer}
                      </div>
                    </div>
                    <div className="border border-border/40 bg-surface/80 px-4 py-3">
                      <div className="text-[10px] tracking-wider text-muted">Manual Soroban</div>
                      <div className="mt-1 text-lg font-bold">
                        {summary.byType.manual_soroban}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> FILTERS"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded border border-border/40 bg-surface px-3 py-2 text-xs text-foreground"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="rounded border border-border/40 bg-surface px-3 py-2 text-xs text-foreground"
                  >
                    <option value="all">All Types</option>
                    <option value="agent_execution">Agent Execution</option>
                    <option value="manual_transfer">Manual Transfer</option>
                    <option value="manual_soroban">Manual Soroban</option>
                  </select>
                </div>
              </div>

              {/* Activity List */}
              <div className="mb-4">
                <div className="mb-3 text-xs font-semibold tracking-widest text-muted">
                  {">> TRANSACTION_HISTORY"} ({filteredActivities.length})
                </div>
                {loading && filteredActivities.length === 0 ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-6 text-center">
                    <div className="text-sm text-muted flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      &gt; Loading transactions...
                    </div>
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-6 text-center">
                    <div className="text-sm text-muted">&gt; No transactions found</div>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-x-auto">
                    {filteredActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="border border-border/40 bg-surface/50 px-4 py-3 transition-colors hover:bg-surface/80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                              <span className="text-xs font-semibold tracking-wider text-foreground truncate">
                                {getTypeLabel(activity.transactionType)}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${getStatusColor(
                                  activity.status
                                )}`}
                              >
                                {activity.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] tracking-wider text-muted">
                              Agent: {activity.agentId.slice(0, 16)}...
                            </div>
                            <div className="text-[9px] text-muted">
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {activity.txHash && (
                              <a
                                href={txExplorerUrl(activity.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent/80 transition-colors"
                                title={activity.txHash}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {activity.errorMsg && (
                              <div
                                title={activity.errorMsg}
                                className="text-red-400 cursor-help"
                              >
                                ⚠
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="hidden w-[280px] shrink-0 lg:flex flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">ACTIVITY_LOG</div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted space-y-2">
          <div>&gt; Activity log loaded</div>
          <div>&gt; Showing all transactions:</div>
          <div>&nbsp;&nbsp;• Agent executions</div>
          <div>&nbsp;&nbsp;• Manual transfers</div>
          <div>&nbsp;&nbsp;• Soroban calls</div>
          {summary && (
            <>
              <div className="mt-2 border-t border-border/40 pt-2">Total: {summary.totalTransactions}</div>
              <div>Success: {summary.successful}</div>
              <div>Failed: {summary.failed}</div>
            </>
          )}
        </div>
      </aside>
    </HudShell>
  );
}
