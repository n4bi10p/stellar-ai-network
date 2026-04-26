// Tests for workflow orchestrator — condition evaluation and step routing

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock dependencies ─────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    $queryRaw: vi.fn().mockResolvedValue([{ id: "run-mock-id" }]),
    $executeRaw: vi.fn().mockResolvedValue(1),
  }),
}));

vi.mock("@/lib/store/agents", () => ({
  getAgentById: vi.fn(),
}));

vi.mock("@/lib/agents/executor", () => ({
  executeAgentOnce: vi.fn(),
}));

vi.mock("@/lib/agents/governance", () => ({
  evaluateGovernanceForExecution: vi.fn(),
}));

vi.mock("@/lib/agents/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { runWorkflow } from "@/lib/agents/workflow-orchestrator";
import type { WorkflowDefinition } from "@/lib/agents/workflow-types";
import * as executorMod from "@/lib/agents/executor";
import * as governanceMod from "@/lib/agents/governance";
import * as agentsMod from "@/lib/store/agents";

// Typed as any for mock flexibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const exec = vi.mocked(executorMod.executeAgentOnce) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gov  = vi.mocked(governanceMod.evaluateGovernanceForExecution) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agts = vi.mocked(agentsMod.getAgentById) as any;

const MOCK_AGENT = {
  id: "agent-1",
  contractId: "C_TEST",
  owner: "GOWNER",
  name: "Test Agent",
  strategy: "recurring_payment",
  governance: {},
  strategyConfig: { amount: 10, recipient: "GDEST" },
  templateId: null,
  createdAt: new Date().toISOString(),
  txHash: null,
};

const GOV_ALLOW = { allowed: true, submitAllowed: true, governance: {} };
const GOV_BLOCK = { allowed: false, submitAllowed: false, reason: "Daily spend limit exceeded", governance: {} };

function makeExec(executed: boolean, extra?: Record<string, unknown>) {
  return {
    agentId: "agent-1",
    contractId: "C_TEST",
    executed,
    txHash: executed ? "mocktx123" : null,
    reason: executed ? "executed" : "not due",
    logMetadata: { amountXlm: 10 },
    error: undefined,
    ...extra,
  };
}

function makeWorkflow(steps: WorkflowDefinition["steps"]): WorkflowDefinition {
  return {
    id: "wf-test-1",
    owner: "GOWNER",
    name: "Test Workflow",
    steps,
    status: "active",
    runCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Workflow Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exec.mockResolvedValue(makeExec(true));
    gov.mockResolvedValue(GOV_ALLOW);
    agts.mockResolvedValue(MOCK_AGENT);
  });

  it("runs all steps when all conditions are 'always'", async () => {
    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Step 1", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Step 2", triggerCondition: "always" },
      { stepId: "s3", agentId: "agent-1", name: "Step 3", triggerCondition: "always" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.totalSteps).toBe(3);
    expect(result.completedSteps).toBe(3);
    expect(result.failedSteps).toBe(0);
    expect(result.skippedSteps).toBe(0);
    expect(result.status).toBe("completed");
  });

  it("skips on_success step when previous step does not execute", async () => {
    let call = 0;
    exec.mockImplementation(async () => {
      call++;
      return makeExec(call !== 1); // step 1 fails, step 2 succeeds if called
    });

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Step 1", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Step 2", triggerCondition: "on_success" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.skippedSteps).toBe(1);
    expect(result.steps[1].status).toBe("skipped");
  });

  it("runs on_failure step when previous step does not execute", async () => {
    let call = 0;
    exec.mockImplementation(async () => {
      call++;
      return call === 1 ? makeExec(false) : makeExec(true);
    });

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Primary", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Fallback", triggerCondition: "on_failure" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[1].status).toBe("success");
    expect(result.steps[1].executed).toBe(true);
  });

  it("skips on_failure step when previous step succeeds", async () => {
    exec.mockImplementation(async () => makeExec(true));

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Primary", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Fallback", triggerCondition: "on_failure" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[0].status).toBe("success");
    expect(result.steps[1].status).toBe("skipped");
    expect(result.skippedSteps).toBe(1);
  });

  it("evaluates on_condition — runs next step when condition is met", async () => {
    let call = 0;
    exec.mockImplementation(async () => {
      call++;
      return call === 1
        ? makeExec(true, { txHash: "tx1", logMetadata: { amountXlm: 50 } })
        : makeExec(true);
    });

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "DCA", triggerCondition: "always" },
      {
        stepId: "s2",
        agentId: "agent-1",
        name: "Sweep",
        triggerCondition: "on_condition",
        conditionRule: { field: "executed", operator: "==", value: true },
      },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[1].status).toBe("success");
    expect(result.steps[1].executed).toBe(true);
  });

  it("evaluates on_condition — skips when condition is not met", async () => {
    exec.mockImplementation(async () => makeExec(false));

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Alert", triggerCondition: "always" },
      {
        stepId: "s2",
        agentId: "agent-1",
        name: "Buy",
        triggerCondition: "on_condition",
        conditionRule: { field: "executed", operator: "==", value: true },
      },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[1].status).toBe("skipped");
    expect(result.skippedSteps).toBe(1);
  });

  it("returns dry_run status in dry-run mode without calling executor", async () => {
    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Bill Pay", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Sweep",    triggerCondition: "on_success" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual", dryRun: true });

    expect(exec).not.toHaveBeenCalled();
    expect(result.steps[0].status).toBe("dry_run");
    expect(result.steps[1].status).toBe("dry_run");
    expect(result.completedSteps).toBe(2);
  });

  it("blocks step when governance denies execution", async () => {
    gov.mockResolvedValueOnce(GOV_BLOCK);

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Pay", triggerCondition: "always" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[0].status).toBe("failed");
    expect(result.steps[0].error).toMatch(/governance blocked/i);
    expect(result.status).toBe("failed");
  });

  it("handles missing agent gracefully", async () => {
    agts.mockResolvedValueOnce(undefined);

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "nonexistent-agent", name: "Ghost", triggerCondition: "always" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.steps[0].status).toBe("failed");
    expect(result.steps[0].error).toMatch(/not found/i);
  });

  it("returns partial status when some steps succeed and some fail", async () => {
    let call = 0;
    exec.mockImplementation(async () => {
      call++;
      if (call === 1) return makeExec(true);
      throw new Error("Stellar RPC error");
    });

    const workflow = makeWorkflow([
      { stepId: "s1", agentId: "agent-1", name: "Step 1", triggerCondition: "always" },
      { stepId: "s2", agentId: "agent-1", name: "Step 2", triggerCondition: "always" },
    ]);

    const result = await runWorkflow({ workflow, triggerSource: "manual" });

    expect(result.completedSteps).toBe(1);
    expect(result.failedSteps).toBe(1);
    expect(result.status).toBe("partial");
  });
});
