"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentOption {
  id: string;
  name: string;
  strategy: string;
  contractId: string;
}

interface StepDraft {
  stepId: string;
  agentId: string;
  name: string;
  triggerCondition: "always" | "on_success" | "on_failure" | "on_condition";
  passContext: boolean;
  conditionRule?: { field: string; operator: string; value: string };
}

const TRIGGER_OPTIONS = [
  { value: "always",       label: "ALWAYS",       desc: "Run regardless of previous step" },
  { value: "on_success",   label: "ON_SUCCESS",   desc: "Run only if previous step executed" },
  { value: "on_failure",   label: "ON_FAILURE",   desc: "Run only if previous step failed/skipped" },
  { value: "on_condition", label: "ON_CONDITION", desc: "Run when a custom field rule is met" },
];

const CONDITION_FIELDS    = ["executed", "amountXlm", "txHash"];
const CONDITION_OPERATORS = ["==", "!=", ">", "<", ">=", "<="];

const TEMPLATE_NAMES: Record<string, string> = {
  sweep_rebalance:     "SWEEP → REBALANCE",
  alert_dca:           "ALERT → DCA_BUY",
  bill_sweep_rebalance:"BILL → SWEEP → REBALANCE",
  alert_dca_sweep:     "ALERT → DCA → SWEEP",
};

const TEMPLATE_STEP_NAMES: Record<string, string[]> = {
  sweep_rebalance:     ["Savings Sweep", "Auto-Rebalancer"],
  alert_dca:           ["Price Alert", "DCA Bot"],
  bill_sweep_rebalance:["Bill Scheduler", "Savings Sweep", "Auto-Rebalancer"],
  alert_dca_sweep:     ["Price Alert", "DCA Bot", "Savings Sweep"],
};

const TEMPLATE_TRIGGERS: Record<string, StepDraft["triggerCondition"][]> = {
  sweep_rebalance:     ["always", "on_success"],
  alert_dca:           ["always", "on_success"],
  bill_sweep_rebalance:["always", "always", "on_success"],
  alert_dca_sweep:     ["always", "on_success", "always"],
};

function makeStep(index: number): StepDraft {
  return {
    stepId: `step-${Date.now()}-${index}`,
    agentId: "",
    name: "",
    triggerCondition: index === 0 ? "always" : "on_success",
    passContext: true,
  };
}

// ── Agent selector dropdown ───────────────────────────────────────────────────

interface AgentSelectProps {
  value: string;
  agents: AgentOption[];
  loading: boolean;
  onChange: (id: string, name: string) => void;
}

function AgentSelect({ value, agents, loading, onChange }: AgentSelectProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded border border-border/40 bg-background px-3 py-1.5 text-[10px] text-muted">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading agents...
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-1.5 text-[10px] text-yellow-400 tracking-wider">
        No agents deployed yet —{" "}
        <Link href="/agents/create" className="underline">create one first</Link>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const agent = agents.find((a) => a.id === e.target.value);
        onChange(e.target.value, agent?.name ?? "");
      }}
      className="w-full rounded border border-border/40 bg-background px-3 py-1.5 text-[11px] tracking-wider focus:border-accent/50 focus:outline-none"
    >
      <option value="">— select an agent —</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}  [{a.strategy}]  ·  {a.id.slice(0, 8)}...
        </option>
      ))}
    </select>
  );
}

// ── Inner form (uses useSearchParams — must be inside Suspense) ───────────────

function CreateWorkflowForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { connected, address } = useWallet();

  const [name, setName]             = useState("");
  const [description, setDesc]      = useState("");
  const [steps, setSteps]           = useState<StepDraft[]>([makeStep(0), makeStep(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [agents, setAgents]           = useState<AgentOption[]>([]);
  const [agentsLoading, setAgLoading] = useState(false);

  const loadAgents = useCallback(async () => {
    if (!address) return;
    setAgLoading(true);
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: AgentOption[] = (data.agents ?? data ?? []).map((a: AgentOption) => ({
        id:         a.id,
        name:       a.name,
        strategy:   a.strategy,
        contractId: a.contractId,
      }));
      setAgents(list);
    } catch {
      // silently ignore — user can still type an ID manually
    } finally {
      setAgLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) loadAgents();
  }, [connected, address, loadAgents]);

  // Pre-fill from template query param
  useEffect(() => {
    const tpl = params?.get("template");
    if (!tpl || !TEMPLATE_STEP_NAMES[tpl]) return;
    const stepNames    = TEMPLATE_STEP_NAMES[tpl];
    const stepTriggers = TEMPLATE_TRIGGERS[tpl];
    setSteps(
      stepNames.map((n, i) => ({
        stepId:           `step-${Date.now()}-${i}`,
        agentId:          "",
        name:             n,
        triggerCondition: stepTriggers[i] ?? "always",
        passContext:      true,
      }))
    );
    setName(TEMPLATE_NAMES[tpl] ?? "");
  }, [params]);

  // ── Step mutations ──────────────────────────────────────────────────────

  function addStep() {
    if (steps.length >= 10) return;
    setSteps((prev) => [...prev, makeStep(prev.length)]);
  }

  function removeStep(idx: number) {
    if (steps.length <= 2) return;
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep<K extends keyof StepDraft>(idx: number, key: K, value: StepDraft[K]) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function handleAgentSelect(idx: number, agentId: string, agentName: string) {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, agentId, name: s.name === "" ? agentName : s.name }
          : s
      )
    );
  }

  function updateConditionRule(idx: number, field: string, op: string, value: string) {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, conditionRule: { field, operator: op, value } } : s
      )
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address)     { setError("Wallet not connected"); return; }
    if (!name.trim()) { setError("Workflow name is required"); return; }
    if (steps.some((s) => !s.agentId.trim())) {
      setError("All steps need an agent selected");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner:       address,
          name:        name.trim(),
          description: description.trim() || undefined,
          steps: steps.map((s) => ({
            stepId:           s.stepId,
            agentId:          s.agentId.trim(),
            name:             s.name.trim() || (agents.find((a) => a.id === s.agentId)?.name ?? s.agentId),
            triggerCondition: s.triggerCondition,
            passContext:      s.passContext,
            conditionRule:    s.triggerCondition === "on_condition" ? s.conditionRule : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create workflow");
      router.push(`/workflows/${data.workflowId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-3 py-4 sm:px-6">
          <Link
            href="/workflows"
            className="flex items-center gap-1 text-[9px] tracking-widest text-muted hover:text-accent mb-3"
          >
            <ChevronLeft className="h-3 w-3" /> WORKFLOWS
          </Link>
          <div className="text-xs font-bold tracking-widest">CREATE_WORKFLOW</div>
          <div className="mt-1 text-[10px] tracking-wider text-muted">
            {`> Chain your deployed agents into an autonomous multi-step pipeline`}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-3 sm:p-6 space-y-8">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] text-red-400 tracking-wider">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Not connected */}
          {!connected && (
            <div className="border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-[10px] text-yellow-400 tracking-wider">
              {`> Connect your wallet before creating a workflow`}
            </div>
          )}

          {/* ── Workflow info ── */}
          <div className="space-y-4">
            <div className="text-[10px] tracking-widest text-muted">{`// WORKFLOW_INFO`}</div>

            <div>
              <label className="block text-[9px] tracking-widest text-muted mb-1.5">
                WORKFLOW_NAME <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SWEEP → REBALANCE"
                maxLength={80}
                className="w-full rounded border border-border/40 bg-surface/80 px-3 py-2 text-[11px] tracking-wider placeholder:text-muted/40 focus:border-accent/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] tracking-widest text-muted mb-1.5">
                DESCRIPTION <span className="text-muted/50">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What does this workflow do?"
                maxLength={200}
                className="w-full rounded border border-border/40 bg-surface/80 px-3 py-2 text-[11px] tracking-wider placeholder:text-muted/40 focus:border-accent/50 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Steps ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-widest text-muted">{`// STEPS (${steps.length}/10)`}</div>
              <div className="flex items-center gap-3">
                {connected && (
                  <button
                    type="button"
                    onClick={loadAgents}
                    disabled={agentsLoading}
                    className="flex items-center gap-1 text-[9px] tracking-widest text-muted hover:text-accent disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3 w-3 ${agentsLoading ? "animate-spin" : ""}`} />
                    {agentsLoading ? "LOADING..." : "RELOAD_AGENTS"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={addStep}
                  disabled={steps.length >= 10}
                  className="flex items-center gap-1 text-[9px] tracking-widest text-accent hover:underline disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> ADD_STEP
                </button>
              </div>
            </div>

            {connected && !agentsLoading && agents.length > 0 && (
              <div className="text-[9px] tracking-wider text-muted/60">
                {agents.length} agent{agents.length !== 1 ? "s" : ""} available · select one per step below
              </div>
            )}

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={step.stepId}
                  className="relative border border-border/40 bg-surface/80 px-4 py-4"
                >
                  {/* Step number bubble */}
                  <div className="absolute -top-3 left-3 flex h-5 w-5 items-center justify-center rounded-full border border-accent/40 bg-background text-[9px] font-bold text-accent">
                    {idx + 1}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {/* Step name */}
                    <div>
                      <label className="block text-[9px] tracking-widest text-muted mb-1">STEP_NAME</label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(idx, "name", e.target.value)}
                        placeholder={`Step ${idx + 1}`}
                        maxLength={60}
                        className="w-full rounded border border-border/40 bg-background px-3 py-1.5 text-[11px] tracking-wider placeholder:text-muted/40 focus:border-accent/50 focus:outline-none"
                      />
                    </div>

                    {/* Agent selector */}
                    <div>
                      <label className="block text-[9px] tracking-widest text-muted mb-1">
                        AGENT <span className="text-red-400">*</span>
                        <span className="ml-2 text-muted/50 font-normal normal-case">
                          — pick one of your deployed agents
                        </span>
                      </label>
                      <AgentSelect
                        value={step.agentId}
                        agents={agents}
                        loading={agentsLoading}
                        onChange={(id, agentName) => handleAgentSelect(idx, id, agentName)}
                      />
                      {step.agentId && (
                        <div className="mt-1 text-[8px] font-mono text-muted/50 truncate">
                          id: {step.agentId}
                        </div>
                      )}
                    </div>

                    {/* Trigger condition */}
                    <div>
                      <label className="block text-[9px] tracking-widest text-muted mb-1">
                        TRIGGER_CONDITION
                        {idx === 0 && (
                          <span className="ml-2 text-muted/50">(first step is always)</span>
                        )}
                      </label>
                      <select
                        value={step.triggerCondition}
                        onChange={(e) =>
                          updateStep(idx, "triggerCondition", e.target.value as StepDraft["triggerCondition"])
                        }
                        disabled={idx === 0}
                        className="w-full rounded border border-border/40 bg-background px-3 py-1.5 text-[11px] tracking-wider focus:border-accent/50 focus:outline-none disabled:opacity-50"
                      >
                        {TRIGGER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pass context toggle */}
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          onClick={() => updateStep(idx, "passContext", !step.passContext)}
                          className={`relative h-4 w-7 rounded-full border transition-colors ${
                            step.passContext
                              ? "border-accent/60 bg-accent/20"
                              : "border-border/40 bg-surface"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
                              step.passContext ? "left-3.5 bg-accent" : "left-0.5 bg-muted/50"
                            }`}
                          />
                        </div>
                        <span className="text-[9px] tracking-widest text-muted">PASS_CONTEXT</span>
                        <span className="text-[8px] text-muted/50">(pass txHash + result to next step)</span>
                      </label>
                    </div>
                  </div>

                  {/* on_condition rule builder */}
                  {step.triggerCondition === "on_condition" && (
                    <div className="mt-3 border-t border-border/20 pt-3">
                      <div className="text-[9px] tracking-widest text-yellow-400 mb-2">
                        CONDITION_RULE — run this step when:
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={step.conditionRule?.field ?? "executed"}
                          onChange={(e) =>
                            updateConditionRule(idx, e.target.value, step.conditionRule?.operator ?? "==", step.conditionRule?.value ?? "true")
                          }
                          className="rounded border border-border/40 bg-background px-2 py-1 text-[10px] tracking-wider focus:outline-none"
                        >
                          {CONDITION_FIELDS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <select
                          value={step.conditionRule?.operator ?? "=="}
                          onChange={(e) =>
                            updateConditionRule(idx, step.conditionRule?.field ?? "executed", e.target.value, step.conditionRule?.value ?? "true")
                          }
                          className="rounded border border-border/40 bg-background px-2 py-1 text-[10px] tracking-wider focus:outline-none"
                        >
                          {CONDITION_OPERATORS.map((op) => <option key={op}>{op}</option>)}
                        </select>
                        <input
                          type="text"
                          value={step.conditionRule?.value ?? "true"}
                          onChange={(e) =>
                            updateConditionRule(idx, step.conditionRule?.field ?? "executed", step.conditionRule?.operator ?? "==", e.target.value)
                          }
                          placeholder="value"
                          className="w-24 rounded border border-border/40 bg-background px-2 py-1 text-[10px] tracking-wider focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Remove step */}
                  {steps.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="absolute top-3 right-3 text-muted/40 hover:text-red-400 transition-colors"
                      title="Remove step"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!connected || submitting}
              className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-4 py-2 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {submitting ? "CREATING..." : "CREATE_WORKFLOW"}
            </button>
            <Link
              href="/workflows"
              className="text-[10px] tracking-widest text-muted hover:text-foreground"
            >
              CANCEL
            </Link>
          </div>
        </form>
      </main>
    </HudShell>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
// Wrap the form in Suspense so Next.js can statically pre-render the shell.
// useSearchParams() in CreateWorkflowForm requires this boundary (App Router).

export default function CreateWorkflowPage() {
  return (
    <Suspense>
      <CreateWorkflowForm />
    </Suspense>
  );
}
