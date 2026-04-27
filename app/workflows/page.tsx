"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Workflow, RefreshCw, Loader2, Play, Pause, ChevronRight } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import type { WorkflowDefinition } from "@/lib/agents/workflow-types";

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-accent/20 text-accent",
  paused:   "bg-yellow-500/20 text-yellow-400",
  completed:"bg-blue-500/20 text-blue-400",
  archived: "bg-border/40 text-muted",
};

export default function WorkflowsPage() {
  const { connected, address } = useWallet();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows?owner=${address}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const { workflows: wf } = await res.json();
      setWorkflows(wf ?? []);
    } catch (err) {
      console.error("Workflows fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) fetchWorkflows();
  }, [connected, address, fetchWorkflows]);

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-3 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest flex items-center gap-2">
                <Workflow className="h-4 w-4 text-accent" />
                WORKFLOW_ORCHESTRATOR
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Chain agents together for multi-step autonomous execution
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected && (
                <button
                  onClick={fetchWorkflows}
                  disabled={loading}
                  className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              )}
              <Link
                href="/workflows/create"
                className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20"
              >
                <Plus className="h-3.5 w-3.5" />
                NEW_WORKFLOW
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-6">
          {/* Feature description */}
          <div className="mb-6 border border-accent/20 bg-accent/5 px-5 py-4">
            <div className="text-[10px] font-semibold tracking-widest text-accent mb-2">{`// ABOUT_WORKFLOW_ORCHESTRATOR`}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] tracking-wider text-muted">
              <div>
                <div className="text-foreground font-semibold mb-1">CHAIN_AGENTS</div>
                Connect multiple agents so one triggers the next automatically.
              </div>
              <div>
                <div className="text-foreground font-semibold mb-1">SMART_TRIGGERS</div>
                Set conditions — run on success, on failure, or when a custom threshold is met.
              </div>
              <div>
                <div className="text-foreground font-semibold mb-1">CONTEXT_PASSING</div>
                Each step receives the previous step&apos;s tx hash and execution result.
              </div>
            </div>
          </div>

          {/* Workflow list */}
          <div className="mb-3 text-[10px] tracking-widest text-muted">
            {"// MY_WORKFLOWS"}
          </div>

          {!connected ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-10 text-center text-sm text-muted">
              &gt; Connect your wallet to view workflows
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 border border-border/40 bg-surface/80 px-6 py-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-10 text-center">
              <div className="text-sm text-muted">&gt; No workflows created yet</div>
              <div className="text-[10px] text-muted mt-2">Create a workflow to chain agents together</div>
              <Link
                href="/workflows/create"
                className="mt-4 inline-block text-[10px] tracking-widest text-accent underline"
              >
                CREATE_FIRST_WORKFLOW →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <Link
                  key={wf.id}
                  href={`/workflows/${wf.id}`}
                  className="block border border-border/40 bg-surface/80 px-4 py-4 transition-colors hover:border-accent/30 hover:bg-surface-2/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xs font-bold tracking-wider">{wf.name}</div>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${STATUS_COLORS[wf.status] ?? ""}`}>
                          {wf.status.toUpperCase()}
                        </span>
                      </div>
                      {wf.description && (
                        <div className="mt-1 text-[10px] tracking-wider text-muted truncate">{wf.description}</div>
                      )}
                      {/* Mini DAG preview */}
                      <div className="mt-3 flex items-center gap-1 flex-wrap">
                        {wf.steps.map((step, i) => (
                          <span key={step.stepId} className="flex items-center gap-1">
                            <span className="inline-block rounded border border-accent/30 bg-accent/5 px-2 py-0.5 text-[9px] tracking-wider text-accent/80 max-w-[100px] truncate">
                              {step.name || step.stepId}
                            </span>
                            {i < wf.steps.length - 1 && (
                              <span className="text-[9px] text-muted">
                                {step.triggerCondition === "on_success" && "✓→"}
                                {step.triggerCondition === "on_failure" && "✗→"}
                                {step.triggerCondition === "always" && "→"}
                                {step.triggerCondition === "on_condition" && "?→"}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-muted">{wf.steps.length} STEPS</div>
                      <div className="text-[10px] text-muted mt-0.5">{wf.runCount} RUNS</div>
                      {wf.lastRunAt && (
                        <div className="text-[9px] text-muted/60 mt-0.5">
                          Last: {new Date(wf.lastRunAt).toLocaleDateString()}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1 justify-end text-[9px] text-accent tracking-wider">
                        OPEN <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Quick-start templates */}
          {connected && workflows.length === 0 && (
            <div className="mt-8">
              <div className="mb-3 text-[10px] tracking-widest text-muted">{"// QUICK_TEMPLATES"}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_TEMPLATES.map((t) => (
                  <div key={t.id} className="border border-border/40 bg-surface/80 px-4 py-4">
                    <div className="text-xs font-bold tracking-wider">{t.name}</div>
                    <div className="mt-1 text-[10px] tracking-wider text-muted">{t.description}</div>
                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                      {t.steps.map((s, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="inline-block rounded border border-border/40 bg-surface-2/50 px-2 py-0.5 text-[9px] tracking-wider text-muted">
                            {s}
                          </span>
                          {i < t.steps.length - 1 && <span className="text-[9px] text-muted">→</span>}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/workflows/create?template=${t.id}`}
                      className="mt-3 inline-block text-[9px] tracking-widest text-accent underline"
                    >
                      USE_TEMPLATE →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar */}
      <aside className="hidden w-[260px] shrink-0 lg:flex flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">HOW_IT_WORKS</div>
        </div>
        <div className="flex-1 px-4 py-4 text-[10px] leading-relaxed tracking-wider text-muted space-y-4">
          <div>
            <div className="text-foreground font-semibold text-[9px] tracking-widest mb-1">1. CREATE_WORKFLOW</div>
            <div>Name your workflow and add 2+ agents as steps in sequence.</div>
          </div>
          <div>
            <div className="text-foreground font-semibold text-[9px] tracking-widest mb-1">2. SET_CONDITIONS</div>
            <div>Each step declares when it fires: always, on success, on failure, or on a custom condition.</div>
          </div>
          <div>
            <div className="text-foreground font-semibold text-[9px] tracking-widest mb-1">3. RUN_OR_DRY_TEST</div>
            <div>Trigger manually or use dry-run to preview the full execution trace before committing.</div>
          </div>
          <div>
            <div className="text-foreground font-semibold text-[9px] tracking-widest mb-1">4. VIEW_DAG</div>
            <div>The visual DAG shows each step, its trigger condition, and real-time run status.</div>
          </div>
          <div className="border-t border-border/40 pt-3">
            <div className="text-[9px] tracking-widest text-accent">TRIGGER_CONDITIONS</div>
            <div className="mt-2 space-y-1">
              <div><span className="text-foreground">always</span> — unconditional</div>
              <div><span className="text-foreground">on_success</span> — prev step executed</div>
              <div><span className="text-foreground">on_failure</span> — prev step failed</div>
              <div><span className="text-foreground">on_condition</span> — custom rule</div>
            </div>
          </div>
        </div>
      </aside>
    </HudShell>
  );
}

const QUICK_TEMPLATES = [
  {
    id: "sweep_rebalance",
    name: "SWEEP → REBALANCE",
    description: "Sweep excess balance then auto-rebalance portfolio. Runs rebalance only if sweep succeeded.",
    steps: ["Savings Sweep", "on_success", "Auto-Rebalancer"],
  },
  {
    id: "alert_dca",
    name: "ALERT → DCA_BUY",
    description: "Trigger DCA bot when price alert fires. Buys XLM when price drops below threshold.",
    steps: ["Price Alert", "on_success", "DCA Bot"],
  },
  {
    id: "bill_sweep_rebalance",
    name: "BILL → SWEEP → REBALANCE",
    description: "Full 3-step treasury: pay bills, sweep excess, then rebalance what remains.",
    steps: ["Bill Scheduler", "always", "Savings Sweep", "on_success", "Auto-Rebalancer"],
  },
  {
    id: "alert_dca_sweep",
    name: "ALERT → DCA → SWEEP",
    description: "On price drop: buy XLM via DCA, then sweep profits to savings.",
    steps: ["Price Alert", "on_success", "DCA Bot", "always", "Savings Sweep"],
  },
];
