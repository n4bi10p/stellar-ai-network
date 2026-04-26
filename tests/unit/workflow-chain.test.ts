import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseWorkflowChainConfig,
  validateStrategyConfig,
} from "@/lib/utils/validation";
import {
  buildWorkflowChainLogMetadata,
  buildWorkflowChainSuccessStatePatch,
  decideWorkflowChain,
} from "@/lib/agents/strategies/workflow_chain";

const { fetchBalance } = vi.hoisted(() => ({
  fetchBalance: vi.fn(),
}));

vi.mock("@/lib/stellar/client", () => ({
  fetchBalance,
}));

describe("workflow_chain config validation", () => {
  it("normalizes legacy flat config into workflow composer v1 shape", () => {
    const parsed = validateStrategyConfig("workflow_chain", {
      triggerType: "balance_below",
      thresholdXlm: 20,
      checkIntervalSeconds: 300,
      actionType: "send_xlm",
      recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      amountXlm: 5,
      notifyInApp: true,
      notifyMessage: "Balance below 20 XLM",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toEqual({
      version: 1,
      condition: {
        type: "balance_below",
        thresholdXlm: 20,
        checkIntervalSeconds: 300,
      },
      action: {
        type: "send_xlm",
        recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        amountXlm: 5,
      },
      notify: {
        channel: "in_app",
        enabled: true,
        message: "Balance below 20 XLM",
      },
    });
  });

  it("accepts canonical v1 workflow config", () => {
    const config = parseWorkflowChainConfig({
      version: 1,
      condition: {
        type: "balance_below",
        thresholdXlm: 50,
        checkIntervalSeconds: 600,
      },
      action: {
        type: "send_xlm",
        recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        amountXlm: 10,
      },
      notify: {
        channel: "in_app",
        enabled: false,
        message: "Low balance",
      },
    });

    expect(config).toEqual({
      version: 1,
      condition: {
        type: "balance_below",
        thresholdXlm: 50,
        checkIntervalSeconds: 600,
      },
      action: {
        type: "send_xlm",
        recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        amountXlm: 10,
      },
      notify: {
        channel: "in_app",
        enabled: false,
        message: "Low balance",
      },
    });
  });
});

describe("workflow_chain strategy decisions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fires once for a low-balance breach, then suppresses repeats until re-armed", async () => {
    fetchBalance.mockResolvedValue(12.5);

    const first = await decideWorkflowChain({
      now: new Date("2026-04-26T08:00:00.000Z"),
      agent: {
        id: "agent-1",
        contractId: "contract-1",
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        name: "Workflow One",
        strategy: "workflow_chain",
        templateId: "workflow_chain",
        createdAt: "2026-04-26T07:00:00.000Z",
        txHash: null,
        strategyConfig: {
          triggerType: "balance_below",
          thresholdXlm: 20,
          checkIntervalSeconds: 300,
          actionType: "send_xlm",
          recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
          amountXlm: 5,
          notifyInApp: true,
          notifyMessage: "Balance below threshold",
        },
        strategyState: {
          workflowConditionState: "clear",
        },
      },
    });

    expect(first.shouldExecute).toBe(true);

    const second = await decideWorkflowChain({
      now: new Date("2026-04-26T08:06:00.000Z"),
      agent: {
        id: "agent-1",
        contractId: "contract-1",
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        name: "Workflow One",
        strategy: "workflow_chain",
        templateId: "workflow_chain",
        createdAt: "2026-04-26T07:00:00.000Z",
        txHash: null,
        strategyConfig: {
          version: 1,
          condition: {
            type: "balance_below",
            thresholdXlm: 20,
            checkIntervalSeconds: 300,
          },
          action: {
            type: "send_xlm",
            recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            amountXlm: 5,
          },
          notify: {
            channel: "in_app",
            enabled: true,
            message: "Balance below threshold",
          },
        },
        strategyState: {
          lastCheckedAt: "2026-04-26T08:00:00.000Z",
          workflowConditionState: "triggered",
        },
      },
    });

    expect(second.shouldExecute).toBe(false);
    expect(second.reason).toContain("already executed");
  });

  it("re-arms after balance recovers above threshold", async () => {
    fetchBalance.mockResolvedValue(45);

    const result = await decideWorkflowChain({
      now: new Date("2026-04-26T09:00:00.000Z"),
      agent: {
        id: "agent-1",
        contractId: "contract-1",
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        name: "Workflow One",
        strategy: "workflow_chain",
        templateId: "workflow_chain",
        createdAt: "2026-04-26T07:00:00.000Z",
        txHash: null,
        strategyConfig: {
          version: 1,
          condition: {
            type: "balance_below",
            thresholdXlm: 20,
            checkIntervalSeconds: 300,
          },
          action: {
            type: "send_xlm",
            recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            amountXlm: 5,
          },
          notify: {
            channel: "in_app",
            enabled: true,
            message: "Balance below threshold",
          },
        },
        strategyState: {
          workflowConditionState: "triggered",
        },
      },
    });

    expect(result.shouldExecute).toBe(false);
    expect(result.statePatch).toMatchObject({
      workflowConditionState: "clear",
      lastObservedBalanceXlm: 45,
    });
  });
});

describe("workflow_chain log metadata", () => {
  it("records safe step ordering and completion state", () => {
    const successStatePatch = buildWorkflowChainSuccessStatePatch({
      checkedAt: "2026-04-26T08:00:00.000Z",
      observedBalanceXlm: 12.5,
    });

    const metadata = buildWorkflowChainLogMetadata({
      config: {
        version: 1,
        condition: {
          type: "balance_below",
          thresholdXlm: 20,
          checkIntervalSeconds: 300,
        },
        action: {
          type: "send_xlm",
          recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
          amountXlm: 5,
        },
        notify: {
          channel: "in_app",
          enabled: true,
          message: "Balance below threshold",
        },
      },
      observedBalanceXlm: 12.5,
      reason: "Balance below threshold",
      actionStatus: "submitted",
      successStatePatch,
    });

    expect(metadata.safeExecutionOrder).toEqual([
      "condition",
      "action",
      "notify",
    ]);
    expect(metadata.notify.status).toBe("recorded");
    expect(metadata.successStatePatch).toEqual(successStatePatch);
  });
});
