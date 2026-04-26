// Tests for governance enforcement: pause, spend limits, dry-run, audit log

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeGovernance,
  evaluateGovernanceForExecution,
} from "@/lib/agents/governance";
import type { StoredAgent } from "@/lib/store/types";

// Mock execution-logs so we don't hit the filesystem in governance tests
vi.mock("@/lib/store/execution-logs", () => ({
  listExecutionLogsByAgent: vi.fn().mockResolvedValue([]),
}));

function makeAgent(overrides: Partial<StoredAgent> = {}): StoredAgent {
  return {
    id: "agent-test-1",
    contractId: "CONTRACT_ABC",
    owner: "GOWNER",
    name: "Test Agent",
    strategy: "recurring_payment",
    templateId: null,
    createdAt: new Date().toISOString(),
    txHash: null,
    strategyConfig: { amount: 10, recipient: "GDEST" },
    governance: {},
    ...overrides,
  };
}

// ── normalizeGovernance ────────────────────────────────────────────────────

describe("normalizeGovernance", () => {
  it("returns safe defaults when governance is undefined", () => {
    const norm = normalizeGovernance(undefined);
    expect(norm.paused).toBe(false);
    expect(norm.dryRunMode).toBe(false);
    expect(norm.requiresApproval).toBe(false);
    expect(norm.perExecutionLimitXlm).toBeNull();
    expect(norm.dailySpendLimitXlm).toBeNull();
  });

  it("preserves set values", () => {
    const norm = normalizeGovernance({
      paused: true,
      perExecutionLimitXlm: 50,
      dailySpendLimitXlm: 200,
      dryRunMode: true,
      requiresApproval: true,
    });
    expect(norm.paused).toBe(true);
    expect(norm.perExecutionLimitXlm).toBe(50);
    expect(norm.dailySpendLimitXlm).toBe(200);
    expect(norm.dryRunMode).toBe(true);
    expect(norm.requiresApproval).toBe(true);
  });
});

// ── evaluateGovernanceForExecution ────────────────────────────────────────

describe("evaluateGovernanceForExecution", () => {
  it("allows execution when no governance restrictions are set", async () => {
    const agent = makeAgent();
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.submitAllowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks execution when agent is paused", async () => {
    const agent = makeAgent({ governance: { paused: true, pauseReason: "Emergency stop" } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.submitAllowed).toBe(false);
    expect(result.reason).toMatch(/paused/i);
  });

  it("blocks when amount exceeds per-execution limit", async () => {
    const agent = makeAgent({ governance: { perExecutionLimitXlm: 5 } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/per-execution limit/i);
  });

  it("allows when amount is within per-execution limit", async () => {
    const agent = makeAgent({ governance: { perExecutionLimitXlm: 50 } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when daily limit would be exceeded (today spent = 0, but amount > limit)", async () => {
    const agent = makeAgent({ governance: { dailySpendLimitXlm: 5 } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/daily spend limit/i);
  });

  it("allows when daily limit is not exceeded", async () => {
    const agent = makeAgent({ governance: { dailySpendLimitXlm: 100 } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("allows but blocks submit when requiresApproval is true and not approved", async () => {
    const agent = makeAgent({ governance: { requiresApproval: true } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
      approvedByOwner: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/requires owner approval/i);
  });

  it("allows submit when requiresApproval is true and approvedByOwner is true", async () => {
    const agent = makeAgent({ governance: { requiresApproval: true } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
      approvedByOwner: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.submitAllowed).toBe(true);
  });

  it("allows build but blocks submit in dryRunMode", async () => {
    const agent = makeAgent({ governance: { dryRunMode: true } });
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 10,
      submitRequested: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.submitAllowed).toBe(false);
    expect(result.reason).toMatch(/dry-run/i);
  });

  it("rejects invalid (zero) amount", async () => {
    const agent = makeAgent();
    const result = await evaluateGovernanceForExecution({
      agent,
      amountXlm: 0,
      submitRequested: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/invalid amount/i);
  });
});
