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
} from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { AGENT_TEMPLATES } from "@/lib/agents/templates";
import { readConfig } from "@/lib/stellar/contracts";
import { txExplorerUrl } from "@/lib/utils/constants";
import type { AgentDueResult } from "@/lib/agents/executor";

interface DashboardAgent {
  id: string;
  contractId: string;
  owner: string;
  name: string;
  strategy: string;
  templateId: string | null;
  createdAt: string;
  txHash: string | null;
  // Live on-chain data (fetched separately)
  onChain?: {
    active: boolean;
    executions: number;
  } | null;
}

export default function DashboardPage() {
  const { connected, address } = useWallet();
  const [agents, setAgents] = useState<DashboardAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dueAgents, setDueAgents] = useState<AgentDueResult[]>([]);
  const [dueLoading, setDueLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      const { agents: stored } = await res.json();

      // Enrich with on-chain data
      const enriched: DashboardAgent[] = await Promise.all(
        (stored as DashboardAgent[]).map(async (a) => {
          try {
            const cfg = await readConfig(a.contractId);
            return { ...a, onChain: cfg ? { active: cfg.active, executions: cfg.executions } : null };
          } catch {
            return { ...a, onChain: null };
          }
        })
      );

      setAgents(enriched);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const fetchDueAgents = useCallback(async () => {
    if (!address) return;
    setDueLoading(true);
    try {
      const res = await fetch(`/api/agents/due?owner=${address}`);
      if (!res.ok) throw new Error("Failed to fetch due agents");
      const { due } = await res.json();
      setDueAgents((due as AgentDueResult[]) ?? []);
    } catch (err) {
      console.error("Due agents fetch error:", err);
    } finally {
      setDueLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      fetchAgents();
      fetchDueAgents();
    }
  }, [connected, address, fetchAgents, fetchDueAgents]);

  // Stats
  const totalAgents = agents.length;
  const activeCount = agents.filter((a) => a.onChain?.active).length;
  const totalExecs = agents.reduce((s, a) => s + (a.onChain?.executions ?? 0), 0);
  const successRate = totalExecs > 0 ? 100 : 0;

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 rounded border border-border/40 px-3 py-1.5 text-[11px] tracking-wider text-muted transition-colors hover:text-foreground"
              >
                {showTemplates ? "HIDE_TEMPLATES" : "TEMPLATES"}
              </button>
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
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Template Browser */}
          {showTemplates && (
            <div className="mb-6">
                <div className="mb-3 text-[10px] tracking-widest text-muted">
                  {"// AGENT_TEMPLATES"}
                </div>
              <div className="grid grid-cols-3 gap-3">
                {AGENT_TEMPLATES.map((t) => (
                  <Link
                    key={t.id}
                    href={`/agents/create?template=${t.id}`}
                    className="border border-border/40 bg-surface/80 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface-2/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <div className="text-xs font-semibold tracking-wider">{t.name}</div>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed tracking-wider text-muted">
                      {t.description.slice(0, 80)}...
                    </div>
                    <div className="mt-2 text-[9px] tracking-widest text-accent">
                      USE_TEMPLATE &rarr;
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">TOTAL_AGENTS</div>
              <div className="mt-1 text-xl font-bold">{totalAgents}</div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">ACTIVE</div>
              <div className="mt-1 text-xl font-bold text-accent">{activeCount}</div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">TOTAL_EXECUTIONS</div>
              <div className="mt-1 text-xl font-bold">{totalExecs}</div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">SUCCESS_RATE</div>
              <div className="mt-1 text-xl font-bold text-accent">{successRate}%</div>
            </div>
          </div>

          {/* Due Agents */}
          <div className="mt-6">
            <div className="mb-3 text-[10px] tracking-widest text-muted">
              {"// DUE_AGENTS"}
            </div>
            {!connected ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-6 text-center text-sm text-muted">
                <div>&gt; Connect your wallet to view due agents</div>
              </div>
            ) : dueLoading ? (
              <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-6 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading due agents...
              </div>
            ) : dueAgents.length === 0 ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-6 text-center text-sm text-muted">
                <div>&gt; No agents due right now</div>
              </div>
            ) : (
              <div className="space-y-2">
                {dueAgents.map((due) => {
                  const agent = agents.find((a) => a.id === due.agentId);
                  return (
                    <Link
                      key={due.agentId}
                      href={`/agents/${due.contractId}`}
                      className="flex items-center justify-between border border-border/40 bg-surface/80 px-4 py-3 transition-colors hover:bg-surface-2/80"
                    >
                      <div>
                        <div className="text-xs font-bold tracking-wider">
                          {agent?.name ?? due.contractId.slice(0, 12)}
                        </div>
                        <div className="mt-0.5 text-[10px] tracking-wider text-muted">
                          {agent?.strategy ?? "strategy"} —{" "}
                          {due.reason ?? "Due for execution"}
                        </div>
                      </div>
                      <div className="text-[10px] text-accent">OPEN &rarr;</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agent list */}
          <div className="mt-6">
            <div className="mb-3 text-[10px] tracking-widest text-muted">
              {"// DEPLOYED_AGENTS"}
            </div>

            {!connected ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
                <div className="text-sm text-muted">&gt; Connect your wallet to view agents</div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-8 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
                <div className="text-sm text-muted">&gt; No agents deployed yet</div>
                <Link
                  href="/agents/create"
                  className="mt-3 inline-block text-[10px] tracking-widest text-accent underline"
                >
                  CREATE_FIRST_AGENT &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
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
                        <div className="text-xs font-bold tracking-wider">{agent.name}</div>
                        <div className="text-[10px] tracking-wider text-muted">
                          STRATEGY: {agent.strategy}
                          {agent.templateId && (
                            <span className="ml-2 text-accent/70">({agent.templateId})</span>
                          )}
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
                        {agent.onChain?.active ? "ACTIVE" : agent.onChain === null ? "UNKNOWN" : "STOPPED"}
                      </span>
                      {agent.txHash && (
                        <span
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(txExplorerUrl(agent.txHash!), "_blank");
                          }}
                          className="cursor-pointer text-muted transition-colors hover:text-accent"
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

      {/* Right sidebar — analytics */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">ANALYTICS</div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Dashboard loaded</div>
          <div>&gt; {totalAgents} agents registered</div>
          <div>&gt; {activeCount} currently active</div>
          <div>&gt; {totalExecs} total executions</div>
          <div>&gt; Success rate: {successRate}%</div>
          {agents.length > 0 && (
            <>
              <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
                RECENT_AGENTS
              </div>
              {agents.slice(0, 5).map((a) => (
                <div key={a.id} className="mt-1">
                  &gt; {a.name} [{a.strategy}] — {a.onChain?.executions ?? "?"} exec
                </div>
              ))}
            </>
          )}
          <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
            TEMPLATES_AVAILABLE
          </div>
          {AGENT_TEMPLATES.map((t) => (
            <div key={t.id} className="mt-1">
              &gt; {t.icon} {t.name}
            </div>
          ))}
        </div>
      </aside>
    </HudShell>
  );
}
