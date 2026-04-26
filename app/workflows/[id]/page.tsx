"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Play, Pause, RotateCcw, Loader2, CheckCircle,
  XCircle, Clock, SkipForward, Zap, ArrowRight,
} from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import type { WorkflowDefinition, WorkflowRunRecord, StepRunResult } from "@/lib/agents/workflow-types";

// ── Status helpers ────────────────────────────────────────────────────────

const STEP_COLORS: Record<string, string> = {
  pending:  "border-border/40 bg-surface/80 text-muted",
  running:  "border-blue-400/60 bg-blue-500/10 text-blue-300",
  success:  "border-accent/60 bg-accent/10 text-accent",
  failed:   "border-red-400/60 bg-red-500/10 text-red-400",
  skipped:  "border-border/40 bg-surface/50 text-muted/50",
  dry_run:  "border-yellow-400/60 bg-yellow-500/10 text-yellow-300",
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  pending:  <Clock className="h-4 w-4" />,
  running:  <Loader2 className="h-4 w-4 animate-spin" />,
  success:  <CheckCircle className="h-4 w-4" />,
  failed:   <XCircle className="h-4 w-4" />,
  skipped:  <SkipForward className="h-4 w-4" />,
  dry_run:  <Zap className="h-4 w-4" />,
};

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  always:       { label: "ALWAYS",       color: "text-muted" },
  on_success:   { label: "ON_SUCCESS",   color: "text-accent" },
  on_failure:   { label: "ON_FAILURE",   color: "text-red-400" },
  on_condition: { label: "ON_CONDITION", color: "text-yellow-400" },
};

// ── DAG Visualisation ─────────────────────────────────────────────────────

interface DagStepNodeProps {
  step: WorkflowDefinition["steps"][number];
  index: number;
  isLast: boolean;
  liveResult?: StepRunResult | null;
}

function DagStepNode({ step, index, isLast, liveResult }: DagStepNodeProps) {
  const status = liveResult?.status ?? "pending";
  const colors = STEP_COLORS[status] ?? STEP_COLORS.pending;
  const icon = STEP_ICONS[status] ?? STEP_ICONS.pending;
  const trigger = step.triggerCondition;
  const trig = TRIGGER_LABELS[trigger] ?? TRIGGER_LABELS.always;

  return (
    <div className="flex items-center gap-0">
      {/* Node */}
      <div className={`relative flex min-w-[140px] max-w-[180px] flex-col rounded border px-3 py-3 transition-all duration-300 ${colors}`}>
        {/* Step number badge */}
        <div className="absolute -top-2.5 -left-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-current bg-background text-[9px] font-bold">
          {index + 1}
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <div className="text-[10px] font-bold tracking-wider truncate">{step.name || step.stepId}</div>
        </div>

        <div className="text-[9px] tracking-wider opacity-70 truncate">
          {step.agentId.slice(0, 12)}...
        </div>

        {liveResult?.txHash && (
          <div className="mt-1 text-[8px] tracking-wider font-mono opacity-60 truncate">
            tx: {liveResult.txHash.slice(0, 10)}...
          </div>
        )}

        {liveResult?.error && (
          <div className="mt-1 text-[8px] text-red-400 truncate">{liveResult.error.slice(0, 40)}</div>
        )}

        {liveResult?.skippedReason && (
          <div className="mt-1 text-[8px] opacity-60 truncate">{liveResult.skippedReason.slice(0, 40)}</div>
        )}

        {liveResult?.durationMs !== undefined && liveResult.durationMs > 0 && (
          <div className="mt-1 text-[8px] opacity-50">{liveResult.durationMs}ms</div>
        )}
      </div>

      {/* Connector arrow to next step */}
      {!isLast && (
        <div className="flex flex-col items-center px-2">
          <div className={`text-[8px] font-bold tracking-wider ${trig.color} mb-0.5`}>{trig.label}</div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>
      )}
    </div>
  );
}

// ── Run History Row ────────────────────────────────────────────────────────

function RunHistoryRow({ run }: { run: WorkflowRunRecord }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    run.status === "completed" ? "text-accent" :
    run.status === "partial"   ? "text-yellow-400" :
    run.status === "failed"    ? "text-red-400" : "text-blue-400";

  return (
    <div className="border border-border/40 bg-surface/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold tracking-wider ${statusColor}`}>
              {run.status.toUpperCase()}
            </span>
            <span className="text-[9px] text-muted">{run.triggerSource}</span>
          </div>
          <div className="text-[9px] text-muted mt-0.5">
            {new Date(run.startedAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted">
            ✓ {run.completedSteps} / ✗ {run.failedSteps} / ↷ {run.skippedSteps}
          </div>
          <div className="text-[9px] text-muted/60 mt-0.5">
            {expanded ? "▲ collapse" : "▼ expand"}
          </div>
        </div>
      </button>

      {expanded && run.steps.length > 0 && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-2">
          {run.steps.map((s) => (
            <div key={s.stepId} className="flex items-start gap-3">
              <div className={`mt-0.5 ${STEP_COLORS[s.status]?.split(" ")[2] ?? "text-muted"}`}>
                {STEP_ICONS[s.status]}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider">{s.agentName}</div>
                <div className="text-[9px] text-muted">
                  {s.executed ? `executed — ${s.txHash ? `tx: ${s.txHash.slice(0, 16)}...` : "no txHash"}` :
                   s.error ? `error: ${s.error.slice(0, 60)}` :
                   s.skippedReason ? `skipped: ${s.skippedReason.slice(0, 60)}` :
                   s.reason ?? "not executed"}
                </div>
                {s.durationMs > 0 && (
                  <div className="text-[8px] text-muted/50">{s.durationMs}ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { address } = useWallet();

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [liveSteps, setLiveSteps] = useState<StepRunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error("Not found");
      const { workflow: wf, runs: r } = await res.json();
      setWorkflow(wf);
      setRuns(r ?? []);
    } catch (err) {
      console.error("Workflow fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchWorkflow();
  }, [id, fetchWorkflow]);

  const handleRun = async () => {
    if (!address || !workflow) return;
    setRunning(true);
    setLiveSteps(null);
    setRunError(null);

    try {
      const res = await fetch(`/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: address, dryRun: isDryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error ?? "Run failed");
      } else {
        setLiveSteps(data.steps ?? []);
        // Refresh after run
        await fetchWorkflow();
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const handleTogglePause = async () => {
    if (!address || !workflow) return;
    setToggling(true);
    const newStatus = workflow.status === "paused" ? "active" : "paused";
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: address, status: newStatus }),
      });
      await fetchWorkflow();
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <HudShell>
        <div className="flex flex-1 items-center justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading workflow...
        </div>
      </HudShell>
    );
  }

  if (!workflow) {
    return (
      <HudShell>
        <div className="flex flex-1 items-center justify-center text-muted">
          Workflow not found.{" "}
          <Link href="/workflows" className="ml-2 text-accent underline">Back to Workflows</Link>
        </div>
      </HudShell>
    );
  }

  const isOwner = address === workflow.owner;
  const canRun = isOwner && workflow.status === "active";

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-3 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/workflows" className="flex items-center gap-1 text-[9px] tracking-widest text-muted hover:text-accent mb-2">
                <ChevronLeft className="h-3 w-3" /> WORKFLOWS
              </Link>
              <div className="text-xs font-bold tracking-widest">{workflow.name}</div>
              {workflow.description && (
                <div className="mt-1 text-[10px] tracking-wider text-muted">{workflow.description}</div>
              )}
              <div className="mt-1 flex items-center gap-3">
                <span className="text-[9px] tracking-wider text-muted">
                  {workflow.steps.length} STEPS · {workflow.runCount} RUNS
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                  workflow.status === "active" ? "bg-accent/20 text-accent" :
                  workflow.status === "paused" ? "bg-yellow-500/20 text-yellow-400" : "bg-border/40 text-muted"
                }`}>
                  {workflow.status.toUpperCase()}
                </span>
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Dry-run toggle */}
                <button
                  onClick={() => setIsDryRun(!isDryRun)}
                  className={`rounded border px-3 py-1.5 text-[11px] tracking-wider transition-colors ${
                    isDryRun
                      ? "border-yellow-400/50 bg-yellow-500/10 text-yellow-300"
                      : "border-border/40 text-muted hover:text-foreground"
                  }`}
                >
                  {isDryRun ? "DRY_RUN_ON" : "DRY_RUN"}
                </button>

                {/* Pause/Resume */}
                <button
                  onClick={handleTogglePause}
                  disabled={toggling}
                  className="flex items-center gap-1.5 rounded border border-border/40 px-3 py-1.5 text-[11px] tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-40"
                >
                  {workflow.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {workflow.status === "paused" ? "RESUME" : "PAUSE"}
                </button>

                {/* Run */}
                <button
                  onClick={handleRun}
                  disabled={!canRun || running}
                  className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {running ? "RUNNING..." : isDryRun ? "DRY_RUN" : "RUN_NOW"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-6 space-y-8">
          {/* Error */}
          {runError && (
            <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] text-red-400 tracking-wider">
              ✗ {runError}
            </div>
          )}

          {/* ── Visual DAG ── */}
          <div>
            <div className="mb-4 text-[10px] tracking-widest text-muted">{"// WORKFLOW_DAG"}</div>
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start gap-0 min-w-max">
                {workflow.steps.map((step, i) => (
                  <DagStepNode
                    key={step.stepId}
                    step={step}
                    index={i}
                    isLast={i === workflow.steps.length - 1}
                    liveResult={liveSteps ? liveSteps[i] ?? null : null}
                  />
                ))}
              </div>
            </div>

            {/* Live run result summary */}
            {liveSteps && (
              <div className="mt-4 border border-border/40 bg-surface/80 px-4 py-3">
                <div className="text-[10px] tracking-widest text-muted mb-2">// LAST_RUN_SUMMARY</div>
                <div className="flex items-center gap-4 text-[10px] tracking-wider">
                  <span className="text-accent">✓ {liveSteps.filter((s) => s.status === "success" || s.status === "dry_run").length} ran</span>
                  <span className="text-red-400">✗ {liveSteps.filter((s) => s.status === "failed").length} failed</span>
                  <span className="text-muted">↷ {liveSteps.filter((s) => s.status === "skipped").length} skipped</span>
                  {isDryRun && <span className="text-yellow-400">DRY_RUN_MODE</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── Step Configuration Table ── */}
          <div>
            <div className="mb-3 text-[10px] tracking-widest text-muted">{"// STEP_CONFIGURATION"}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] tracking-wider">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-3 py-2 text-left text-[9px] text-muted">#</th>
                    <th className="px-3 py-2 text-left text-[9px] text-muted">STEP_NAME</th>
                    <th className="px-3 py-2 text-left text-[9px] text-muted">AGENT_ID</th>
                    <th className="px-3 py-2 text-left text-[9px] text-muted">TRIGGER</th>
                    <th className="px-3 py-2 text-left text-[9px] text-muted">CONTEXT</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.steps.map((step, i) => {
                    const t = TRIGGER_LABELS[step.triggerCondition] ?? TRIGGER_LABELS.always;
                    return (
                      <tr key={step.stepId} className="border-b border-border/20 hover:bg-surface-2/30">
                        <td className="px-3 py-2 text-muted">{i + 1}</td>
                        <td className="px-3 py-2 font-bold">{step.name || step.stepId}</td>
                        <td className="px-3 py-2 font-mono text-muted">{step.agentId.slice(0, 16)}...</td>
                        <td className={`px-3 py-2 font-bold ${t.color}`}>{t.label}</td>
                        <td className="px-3 py-2 text-muted">{step.passContext ? "YES" : "NO"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Run History ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] tracking-widest text-muted">{"// RUN_HISTORY"}</div>
              {runs.length > 0 && (
                <button
                  onClick={fetchWorkflow}
                  className="text-[9px] tracking-wider text-muted hover:text-accent flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> REFRESH
                </button>
              )}
            </div>

            {runs.length === 0 ? (
              <div className="border border-border/40 bg-surface/80 px-6 py-6 text-center text-[10px] text-muted">
                &gt; No runs yet. Click RUN_NOW to execute this workflow.
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <RunHistoryRow key={run.id} run={run} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </HudShell>
  );
}
