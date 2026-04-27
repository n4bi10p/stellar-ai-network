// ── Multi-Agent Workflow Orchestrator Engine ──
// Executes chained agents sequentially, passing context between steps,
// evaluating trigger conditions, and persisting run records.

import { getPrismaClient } from "@/lib/db/client";
import { getAgentById } from "@/lib/store/agents";
import { executeAgentOnce } from "@/lib/agents/executor";
import { evaluateGovernanceForExecution } from "@/lib/agents/governance";
import { createLogger } from "@/lib/logging/logger";
import { writeAuditLog } from "@/lib/agents/audit-log";
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowRunRecord,
  StepRunResult,
  StepRunStatus,
  WorkflowConditionRule,
} from "./workflow-types";

const log = createLogger("workflow-orchestrator");

// ── Condition Evaluation ──────────────────────────────────────────────────

function evaluateConditionRule(
  rule: WorkflowConditionRule,
  previousOutput: StepRunResult
): boolean {
  const fieldMap: Record<string, unknown> = {
    executed: previousOutput.executed,
    amountXlm: previousOutput.amountXlm ?? 0,
    txHash: previousOutput.txHash,
    successRate: previousOutput.executed ? 100 : 0,
  };

  const fieldValue = fieldMap[rule.field];
  const v = rule.value;

  switch (rule.operator) {
    case "==":  return fieldValue == v;  // intentional loose equality
    case "!=":  return fieldValue != v;
    case ">":   return Number(fieldValue) > Number(v);
    case "<":   return Number(fieldValue) < Number(v);
    case ">=":  return Number(fieldValue) >= Number(v);
    case "<=":  return Number(fieldValue) <= Number(v);
    default:    return false;
  }
}

function shouldRunStep(
  step: WorkflowStep,
  previousOutput: StepRunResult | null | undefined
): { run: boolean; skipReason?: string } {
  if (!previousOutput) {
    // First step — always run
    return { run: true };
  }

  const prevSucceeded =
    previousOutput.status === "success" || previousOutput.status === "dry_run";

  switch (step.triggerCondition) {
    case "always":
      return { run: true };

    case "on_success":
      if (prevSucceeded) return { run: true };
      return { run: false, skipReason: `Skipped: previous step did not succeed (status: ${previousOutput.status})` };

    case "on_failure":
      // Fire when previous step explicitly failed OR skipped (strategy said no)
      if (!prevSucceeded) return { run: true };
      return { run: false, skipReason: `Skipped: previous step succeeded` };

    case "on_condition":
      if (!step.conditionRule) {
        return { run: false, skipReason: "Skipped: on_condition without conditionRule" };
      }
      if (evaluateConditionRule(step.conditionRule, previousOutput)) {
        return { run: true };
      }
      return {
        run: false,
        skipReason: `Condition not met: ${step.conditionRule.field} ${step.conditionRule.operator} ${JSON.stringify(step.conditionRule.value)}`,
      };

    default:
      return { run: true };
  }
}

// ── Step Executor ─────────────────────────────────────────────────────────

async function executeStep(
  step: WorkflowStep,
  stepIndex: number,
  workflowOwner: string,
  previousOutput: StepRunResult | null
): Promise<StepRunResult> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const baseResult: Omit<StepRunResult, "status" | "executed" | "completedAt" | "durationMs"> = {
    stepId: step.stepId,
    stepIndex,
    agentId: step.agentId,
    agentName: step.name,
    startedAt,
  };

  // Check trigger condition
  const { run, skipReason } = shouldRunStep(step, previousOutput);
  if (!run) {
    return {
      ...baseResult,
      status: "skipped",
      executed: false,
      skippedReason: skipReason,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
  }

  // Optional delay
  if (step.delaySeconds && step.delaySeconds > 0) {
    // In serverless we can't actually sleep long, but we log the intent
    log.info(`Step ${step.stepId} has delay ${step.delaySeconds}s — skipping wait in serverless context`);
  }

  const agent = await getAgentById(step.agentId);
  if (!agent) {
    return {
      ...baseResult,
      status: "failed",
      executed: false,
      error: `Agent ${step.agentId} not found`,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
  }

  // Governance check
  const prelimAmount =
    typeof agent.strategyConfig?.amount === "number"
      ? (agent.strategyConfig.amount as number)
      : 0;

  const govCheck = await evaluateGovernanceForExecution({
    agent,
    // amountXlm intentionally omitted: workflow orchestration is a trigger call,
    // not a direct spend. Spend-limit checks happen inside the executor when
    // the agent actually submits a Stellar transaction.
    submitRequested: true,
  });

  if (!govCheck.allowed) {
    await writeAuditLog({
      agentId: agent.id,
      owner: workflowOwner,
      action: "spend_limit_blocked",
      details: { reason: govCheck.reason, workflowStep: step.stepId },
    });
    return {
      ...baseResult,
      status: "failed",
      executed: false,
      error: `Governance blocked: ${govCheck.reason}`,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
  }

  // Execute
  try {
    const result = await executeAgentOnce({
      agentId: agent.id,
      sourceAddress: agent.owner,
      submit: true,
      triggerSource: "workflow_chain",
    });

    // executed: false without error means strategy chose not to fire — treat as failed for
    // downstream condition evaluation (so on_failure steps can react)
    const stepStatus: StepRunStatus = result.executed ? "success" : "failed";

    return {
      ...baseResult,
      agentName: step.name || agent.name,
      status: stepStatus,
      executed: result.executed,
      txHash: result.txHash ?? null,
      amountXlm: (result.logMetadata?.amountXlm as number) ?? undefined,
      reason: result.reason,
      error: result.error,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      ...baseResult,
      status: "failed",
      executed: false,
      error: errMsg,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
  }
}

// ── Run a Full Workflow ───────────────────────────────────────────────────

export interface RunWorkflowOptions {
  workflow: WorkflowDefinition;
  triggerSource?: "manual" | "cron" | "api";
  /** Run governance checks but don't submit any transactions */
  dryRun?: boolean;
}

export interface RunWorkflowResult {
  runId: string;
  workflowId: string;
  status: WorkflowRunRecord["status"];
  steps: StepRunResult[];
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalSteps: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export async function runWorkflow(options: RunWorkflowOptions): Promise<RunWorkflowResult> {
  const { workflow, triggerSource = "manual", dryRun = false } = options;
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  log.info("workflow started", {
    workflowId: workflow.id,
    name: workflow.name,
    steps: workflow.steps.length,
    triggerSource,
    dryRun,
  });

  const stepResults: StepRunResult[] = [];
  let previousOutput: StepRunResult | null = null;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];

    log.info(`executing step ${i + 1}/${workflow.steps.length}`, {
      workflowId: workflow.id,
      stepId: step.stepId,
      agentId: step.agentId,
      triggerCondition: step.triggerCondition,
    });

    let stepResult: StepRunResult;

    if (dryRun) {
      // Dry-run: evaluate conditions but mark as dry_run, don't actually execute.
      // Treat the previous dry_run step as "would have executed" for condition eval.
      const dryRunPrev = previousOutput?.status === "dry_run"
        ? { ...previousOutput, executed: true }
        : previousOutput;
      const { run, skipReason } = shouldRunStep(step, dryRunPrev);
      stepResult = {
        stepId: step.stepId,
        stepIndex: i,
        agentId: step.agentId,
        agentName: step.name,
        status: run ? "dry_run" : "skipped",
        executed: false,
        skippedReason: run ? undefined : skipReason,
        reason: run ? "Dry-run mode: would execute" : skipReason,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
      };
    } else {
      stepResult = await executeStep(step, i, workflow.owner, previousOutput);
    }

    stepResults.push(stepResult);
    previousOutput = stepResult;

    log.info(`step ${i + 1} result`, {
      workflowId: workflow.id,
      stepId: step.stepId,
      status: stepResult.status,
      executed: stepResult.executed,
      txHash: stepResult.txHash,
    });

    // If a step fails and it was supposed to run, we continue to evaluate
    // remaining steps — they may have on_failure conditions
  }

  const completedSteps = stepResults.filter((s) => s.status === "success" || s.status === "dry_run").length;
  const failedSteps = stepResults.filter((s) => s.status === "failed").length;
  const skippedSteps = stepResults.filter((s) => s.status === "skipped").length;

  let runStatus: RunWorkflowResult["status"];
  if (failedSteps === 0 && skippedSteps === 0) runStatus = "completed";
  else if (failedSteps > 0 && completedSteps > 0) runStatus = "partial";
  else if (failedSteps > 0 && completedSteps === 0) runStatus = "failed";
  else runStatus = "completed";

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  // Persist run record
  let runId = `run_${Date.now()}`;
  try {
    const prisma = getPrismaClient();
    const runRecord = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "AgentWorkflowRun" (
        "id", "workflowId", "status", "triggerSource", "steps",
        "totalSteps", "completedSteps", "failedSteps", "skippedSteps",
        "startedAt", "completedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${workflow.id},
        ${runStatus},
        ${triggerSource},
        ${JSON.stringify(stepResults)}::jsonb,
        ${workflow.steps.length},
        ${completedSteps},
        ${failedSteps},
        ${skippedSteps},
        ${new Date(startedAt)},
        ${new Date(completedAt)}
      )
      RETURNING "id"
    `;

    if (runRecord[0]?.id) runId = runRecord[0].id;

    // Update workflow metadata
    await prisma.$executeRaw`
      UPDATE "AgentWorkflow"
      SET
        "runCount" = "runCount" + 1,
        "lastRunAt" = ${new Date(completedAt)},
        "updatedAt" = now()
      WHERE "id" = ${workflow.id}
    `;
  } catch (err) {
    log.error("failed to persist workflow run", {
      workflowId: workflow.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.info("workflow completed", {
    workflowId: workflow.id,
    runId,
    status: runStatus,
    completedSteps,
    failedSteps,
    skippedSteps,
    durationMs,
  });

  return {
    runId,
    workflowId: workflow.id,
    status: runStatus,
    steps: stepResults,
    completedSteps,
    failedSteps,
    skippedSteps,
    totalSteps: workflow.steps.length,
    startedAt,
    completedAt,
    durationMs,
  };
}

// ── Workflow CRUD helpers ─────────────────────────────────────────────────

export async function getWorkflowById(id: string): Promise<WorkflowDefinition | null> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<Array<{
      id: string; owner: string; name: string; description: string | null;
      steps: unknown; status: string; runCount: number;
      lastRunAt: Date | null; nextRunAt: Date | null;
      createdAt: Date; updatedAt: Date;
    }>>`
      SELECT "id", "owner", "name", "description", "steps", "status",
             "runCount", "lastRunAt", "nextRunAt", "createdAt", "updatedAt"
      FROM "AgentWorkflow"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return mapWorkflowRow(rows[0]);
  } catch {
    return null;
  }
}

export async function listWorkflowsByOwner(owner: string): Promise<WorkflowDefinition[]> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<Array<{
      id: string; owner: string; name: string; description: string | null;
      steps: unknown; status: string; runCount: number;
      lastRunAt: Date | null; nextRunAt: Date | null;
      createdAt: Date; updatedAt: Date;
    }>>`
      SELECT "id", "owner", "name", "description", "steps", "status",
             "runCount", "lastRunAt", "nextRunAt", "createdAt", "updatedAt"
      FROM "AgentWorkflow"
      WHERE "owner" = ${owner}
      ORDER BY "createdAt" DESC
    `;
    return rows.map(mapWorkflowRow);
  } catch {
    return [];
  }
}

export async function listWorkflowRuns(workflowId: string, limit = 20): Promise<WorkflowRunRecord[]> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<Array<{
      id: string; workflowId: string; status: string; triggerSource: string;
      steps: unknown; totalSteps: number; completedSteps: number;
      failedSteps: number; skippedSteps: number;
      startedAt: Date; completedAt: Date | null;
    }>>`
      SELECT r."id", r."workflowId", r."status", r."triggerSource", r."steps",
             r."totalSteps", r."completedSteps", r."failedSteps", r."skippedSteps",
             r."startedAt", r."completedAt",
             w."name" as "workflowName"
      FROM "AgentWorkflowRun" r
      JOIN "AgentWorkflow" w ON w."id" = r."workflowId"
      WHERE r."workflowId" = ${workflowId}
      ORDER BY r."startedAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      workflowId: r.workflowId,
      workflowName: (r as unknown as { workflowName: string }).workflowName,
      status: r.status as WorkflowRunRecord["status"],
      triggerSource: r.triggerSource as WorkflowRunRecord["triggerSource"],
      steps: Array.isArray(r.steps) ? (r.steps as StepRunResult[]) : [],
      totalSteps: r.totalSteps,
      completedSteps: r.completedSteps,
      failedSteps: r.failedSteps,
      skippedSteps: r.skippedSteps,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

function mapWorkflowRow(r: {
  id: string; owner: string; name: string; description: string | null;
  steps: unknown; status: string; runCount: number;
  lastRunAt: Date | null; nextRunAt: Date | null;
  createdAt: Date; updatedAt: Date;
}): WorkflowDefinition {
  return {
    id: r.id,
    owner: r.owner,
    name: r.name,
    description: r.description ?? undefined,
    steps: Array.isArray(r.steps) ? (r.steps as WorkflowDefinition["steps"]) : [],
    status: r.status as WorkflowDefinition["status"],
    runCount: r.runCount,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    nextRunAt: r.nextRunAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
