import { stellarAddressSchema } from "@/lib/utils/validation";
import type { StrategyContext, StrategyDecision } from "./types";

/**
 * Strategy: recurring_payment
 *
 * Expects agent.strategyConfig keys:
 * - recipient: string (Stellar address)
 * - amount: number (XLM)
 * - intervalSeconds: number
 * - maxExecutions?: number
 */
export function decideRecurringPayment(ctx: StrategyContext): StrategyDecision {
  const cfg = (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>;

  const recipient = typeof cfg.recipient === "string" ? cfg.recipient : "";
  const amount = typeof cfg.amount === "number" ? cfg.amount : Number(cfg.amount);
  const intervalSeconds =
    typeof cfg.intervalSeconds === "number"
      ? cfg.intervalSeconds
      : Number(cfg.intervalSeconds ?? 0);
  const maxExecutions =
    typeof cfg.maxExecutions === "number"
      ? cfg.maxExecutions
      : cfg.maxExecutions == null
      ? undefined
      : Number(cfg.maxExecutions);

  if (!recipient) {
    return {
      shouldExecute: false,
      reason: "Missing recipient in strategyConfig",
      nextExecutionAt: null,
    };
  }
  if (!stellarAddressSchema.safeParse(recipient).success) {
    return {
      shouldExecute: false,
      reason: "Invalid recipient address in strategyConfig",
      nextExecutionAt: null,
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      shouldExecute: false,
      reason: "Invalid amount in strategyConfig",
      nextExecutionAt: null,
    };
  }
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return {
      shouldExecute: false,
      reason: "Invalid intervalSeconds in strategyConfig",
      nextExecutionAt: null,
    };
  }

  const execCount = ctx.agent.executionCount ?? 0;
  if (maxExecutions !== undefined && Number.isFinite(maxExecutions)) {
    if (execCount >= maxExecutions) {
      return {
        shouldExecute: false,
        reason: `Max executions reached (${maxExecutions})`,
        nextExecutionAt: null,
      };
    }
  }

  // Time gating
  const last = ctx.agent.lastExecutionAt ? new Date(ctx.agent.lastExecutionAt) : null;
  if (last && !isNaN(last.getTime())) {
    const next = new Date(last.getTime() + intervalSeconds * 1000);
    if (ctx.now.getTime() < next.getTime()) {
      return {
        shouldExecute: false,
        reason: "Not due yet",
        nextExecutionAt: next.toISOString(),
      };
    }
  }

  // Execute now. Next time is now + interval.
  const nextExecutionAt = new Date(ctx.now.getTime() + intervalSeconds * 1000).toISOString();
  return {
    shouldExecute: true,
    recipient,
    amountXlm: amount,
    reason: "Recurring payment due",
    nextExecutionAt,
  };
}

