"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, Power } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  // Mock agent data — will be fetched from contract in Level 2
  const agent = {
    id: agentId,
    name: agentId.toUpperCase().replace(/-/g, "_"),
    strategy: "auto_rebalance",
    active: true,
    executions: 142,
    contractId: "CXXX...PLACEHOLDER",
    createdAt: "2026-02-01T00:00:00Z",
  };

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="text-xs font-semibold tracking-widest">
                  AGENTS // {agent.name}
                </div>
                <div className="mt-1 text-[10px] tracking-wider text-muted">
                  &gt; Agent detail view
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                  agent.active
                    ? "bg-accent/20 text-accent"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {agent.active ? "ACTIVE" : "STOPPED"}
              </span>
              <button className="flex items-center gap-1 rounded border border-border/40 px-2.5 py-1 text-[10px] tracking-wider text-muted transition-colors hover:text-foreground">
                <Power className="h-3 w-3" />
                TOGGLE
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Agent info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                STRATEGY
              </div>
              <div className="mt-1 text-sm font-semibold">
                {agent.strategy}
              </div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                EXECUTIONS
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-3.5 w-3.5 text-accent" />
                {agent.executions}
              </div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                CONTRACT_ID
              </div>
              <div className="mt-1 text-sm font-semibold text-muted">
                {agent.contractId}
              </div>
            </div>
            <div className="border border-border/40 bg-surface/80 px-4 py-3">
              <div className="text-[10px] tracking-wider text-muted">
                CREATED
              </div>
              <div className="mt-1 text-sm font-semibold">
                {new Date(agent.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Execution log placeholder */}
          <div className="mt-6">
            <div className="mb-3 text-[10px] tracking-widest text-muted">
              // EXECUTION_LOG
            </div>
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center text-sm text-muted">
              &gt; Execution history will be available with Soroban contract
              integration (Level 2)
            </div>
          </div>
        </div>
      </main>

      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            AGENT_INFO
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; ID: {agent.id}</div>
          <div>&gt; Status: {agent.active ? "RUNNING" : "STOPPED"}</div>
          <div>&gt; Strategy: {agent.strategy}</div>
          <div>&gt; Executions: {agent.executions}</div>
        </div>
      </aside>
    </HudShell>
  );
}
