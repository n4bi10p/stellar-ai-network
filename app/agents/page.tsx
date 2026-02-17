"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Activity,
  Zap,
  RefreshCw,
  Loader2,
  Clock,
  ExternalLink,
  Search,
} from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { readConfig } from "@/lib/stellar/contracts";
import { txExplorerUrl } from "@/lib/utils/constants";

interface AgentEntry {
  id: string;
  contractId: string;
  owner: string;
  name: string;
  strategy: string;
  templateId: string | null;
  createdAt: string;
  txHash: string | null;
  onChain?: {
    active: boolean;
    executions: number;
  } | null;
}

export default function AgentsPage() {
  const { connected, address } = useWallet();
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "stopped">("all");

  const fetchAgents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      const { agents: stored } = await res.json();

      const enriched: AgentEntry[] = await Promise.all(
        (stored as AgentEntry[]).map(async (a) => {
          try {
            const cfg = await readConfig(a.contractId);
            return {
              ...a,
              onChain: cfg
                ? { active: cfg.active, executions: cfg.executions }
                : null,
            };
          } catch {
            return { ...a, onChain: null };
          }
        })
      );

      setAgents(enriched);
    } catch (err) {
      console.error("Agents fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) fetchAgents();
  }, [connected, address, fetchAgents]);

  const filtered = agents.filter((a) => {
    if (filter === "active") return a.onChain?.active === true;
    if (filter === "stopped") return a.onChain?.active === false;
    return true;
  });

  const totalAgents = agents.length;
  const activeCount = agents.filter((a) => a.onChain?.active).length;
  const totalExecs = agents.reduce(
    (s, a) => s + (a.onChain?.executions ?? 0),
    0
  );

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                AGENTS // DEPLOYED_LIST
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; View and manage all your deployed AI agents
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/agents/create"
                className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20"
              >
                <Plus className="h-3.5 w-3.5" />
                CREATE_AGENT
              </Link>
              {connected && (
                <button
                  onClick={fetchAgents}
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
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                TOTAL_AGENTS
              </div>
              <div className="mt-1 text-xl font-bold">{totalAgents}</div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                ACTIVE
              </div>
              <div className="mt-1 text-xl font-bold text-accent">
                {activeCount}
              </div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                TOTAL_EXECUTIONS
              </div>
              <div className="mt-1 text-xl font-bold">{totalExecs}</div>
            </div>
          </div>

          {/* Filter row */}
          <div className="mt-4 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted" />
            {(["all", "active", "stopped"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2.5 py-1 text-[10px] font-bold tracking-widest transition-colors ${
                  filter === f
                    ? "bg-accent/20 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
            <span className="ml-auto text-[10px] tracking-wider text-muted">
              {filtered.length} agent{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Agent list */}
          <div className="mt-4">
            {!connected ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
                <div className="text-sm text-muted">
                  &gt; Connect your wallet to view agents
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-8 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
              </div>
            ) : filtered.length === 0 ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
                <div className="text-sm text-muted">
                  &gt;{" "}
                  {agents.length === 0
                    ? "No agents deployed yet"
                    : "No agents match current filter"}
                </div>
                {agents.length === 0 && (
                  <Link
                    href="/agents/create"
                    className="mt-3 inline-block text-[10px] tracking-widest text-accent underline"
                  >
                    CREATE_FIRST_AGENT &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.contractId}`}
                    className="flex items-center justify-between border border-border/40 bg-surface/80 px-4 py-3 transition-colors hover:bg-surface-2/80"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded border ${
                          agent.onChain?.active
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
                          {agent.onChain?.executions ?? "?"} exec
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted/60">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                          agent.onChain?.active
                            ? "bg-accent/20 text-accent"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {agent.onChain?.active
                          ? "ACTIVE"
                          : agent.onChain === null
                          ? "UNKNOWN"
                          : "STOPPED"}
                      </span>
                      {agent.txHash && (
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(txExplorerUrl(agent.txHash!), "_blank");
                          }}
                          className="text-muted transition-colors hover:text-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            AGENT_INDEX
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Agents page loaded</div>
          <div>&gt; {totalAgents} agents registered</div>
          <div>&gt; {activeCount} currently active</div>
          <div>&gt; {totalExecs} total executions</div>
          <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
            QUICK_ACTIONS
          </div>
          <div className="mt-2 space-y-1.5">
            <Link
              href="/agents/create"
              className="block text-accent underline"
            >
              &gt; Create new agent
            </Link>
            <Link href="/marketplace" className="block text-accent underline">
              &gt; Browse templates
            </Link>
            <Link href="/dashboard" className="block text-accent underline">
              &gt; Back to dashboard
            </Link>
          </div>
        </div>
      </aside>
    </HudShell>
  );
}
