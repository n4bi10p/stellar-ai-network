import { fetchBalance } from "@/lib/stellar/client";
import {
  parseWorkflowChainConfig,
  type WorkflowChainConfig,
} from "@/lib/utils/validation";
import type { StrategyContext, StrategyDecision } from "./types";

export interface WorkflowChainSuccessPatchInput {
  checkedAt: string;
  observedBalanceXlm: number;
}

export interface WorkflowChainLogMetadata {
  version: 1;
  safeExecutionOrder: ["condition", "action", "notify"];
  reason?: string;
  condition: {
    type: "balance_below";
    matched: boolean;
    thresholdXlm: number;
    observedBalanceXlm: number;
    checkIntervalSeconds: number;
  };
  action: {
    type: "send_xlm";
    recipient: string;
    amountXlm: number;
    status: "built" | "submitted" | "failed";
  };
  notify: {
    channel: "in_app";
    enabled: boolean;
    status: "recorded" | "skipped";
    message: string;
  };
  successStatePatch: Record<string, unknown>;
}

export function buildWorkflowChainSuccessStatePatch(
  input: WorkflowChainSuccessPatchInput
): Record<string, unknown> {
  return {
    workflowConditionState: "triggered",
    lastWorkflowTriggeredAt: input.checkedAt,
    lastWorkflowTriggeredBalanceXlm: input.observedBalanceXlm,
  };
}

export function buildWorkflowChainLogMetadata(options: {
  config: WorkflowChainConfig;
  observedBalanceXlm: number;
  reason?: string;
  actionStatus: "built" | "submitted" | "failed";
  successStatePatch: Record<string, unknown>;
}): WorkflowChainLogMetadata {
  const { config, observedBalanceXlm, reason, actionStatus, successStatePatch } =
    options;

  return {
    version: 1,
    safeExecutionOrder: ["condition", "action", "notify"],
    reason,
    condition: {
      type: config.condition.type,
      matched: true,
      thresholdXlm: config.condition.thresholdXlm,
      observedBalanceXlm,
      checkIntervalSeconds: config.condition.checkIntervalSeconds,
    },
    action: {
      type: config.action.type,
      recipient: config.action.recipient,
      amountXlm: config.action.amountXlm,
      status: actionStatus,
    },
    notify: {
      channel: config.notify.channel,
      enabled: config.notify.enabled,
      status: config.notify.enabled ? "recorded" : "skipped",
      message: config.notify.message,
    },
    successStatePatch,
  };
}

export async function decideWorkflowChain(
  ctx: StrategyContext
): Promise<StrategyDecision> {
  const cfg = parseWorkflowChainConfig(
    (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>
  );
  const state = (ctx.agent.strategyState ?? {}) as Record<string, unknown>;
  const workflowConditionState =
    typeof state.workflowConditionState === "string"
      ? state.workflowConditionState
      : "clear";

  if (!cfg) {
    return {
      shouldExecute: false,
      reason: "Invalid workflow_chain configuration",
      nextExecutionAt: null,
    };
  }

  // Throttle checks to avoid excessive RPC calls.
  const lastCheckedAt =
    typeof state.lastCheckedAt === "string" ? state.lastCheckedAt : null;
  if (lastCheckedAt) {
    const last = new Date(lastCheckedAt);
    if (!isNaN(last.getTime())) {
      const next = new Date(
        last.getTime() + cfg.condition.checkIntervalSeconds * 1000
      );
      if (ctx.now.getTime() < next.getTime()) {
        return {
          shouldExecute: false,
          reason: "Not due for workflow check yet",
          nextExecutionAt: next.toISOString(),
        };
      }
    }
  }

  const currentBalance = Number(await fetchBalance(ctx.agent.owner));
  if (!Number.isFinite(currentBalance)) {
    return {
      shouldExecute: false,
      reason: "Unable to read current wallet balance",
      nextExecutionAt: null,
    };
  }

  const nextExecutionAt = new Date(
    ctx.now.getTime() + cfg.condition.checkIntervalSeconds * 1000
  ).toISOString();

  const statePatch = {
    lastCheckedAt: ctx.now.toISOString(),
    lastObservedBalanceXlm: currentBalance,
  };

  if (currentBalance >= cfg.condition.thresholdXlm) {
    return {
      shouldExecute: false,
      reason: `Workflow not triggered: balance ${currentBalance.toFixed(2)} >= threshold ${cfg.condition.thresholdXlm.toFixed(2)}`,
      nextExecutionAt,
      statePatch: {
        ...statePatch,
        workflowConditionState: "clear",
      },
    };
  }

  if (workflowConditionState === "triggered") {
    return {
      shouldExecute: false,
      reason:
        "Workflow already executed for the current low-balance condition. It will re-arm after balance recovers above threshold.",
      nextExecutionAt,
      statePatch,
    };
  }

  return {
    shouldExecute: true,
    recipient: cfg.action.recipient,
    amountXlm: cfg.action.amountXlm,
    reason: `${cfg.notify.message} (balance ${currentBalance.toFixed(2)} < ${cfg.condition.thresholdXlm.toFixed(2)})`,
    nextExecutionAt,
    statePatch,
  };
}
