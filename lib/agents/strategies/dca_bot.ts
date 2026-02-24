import { stellarAddressSchema } from "@/lib/utils/validation";
import type { StrategyContext, StrategyDecision } from "./types";

/**
 * Strategy: dca_bot
 *
 * Expects:
 * - recipient: string
 * - amount: number (XLM)
 * - intervalSeconds: number
 */
export function decideDcaBot(ctx: StrategyContext): StrategyDecision {
  const cfg = (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>;

  const recipient = typeof cfg.recipient === "string" ? cfg.recipient : "";
  const amount = typeof cfg.amount === "number" ? cfg.amount : Number(cfg.amount ?? 0);
  const intervalSeconds =
    typeof cfg.intervalSeconds === "number"
      ? cfg.intervalSeconds
      : Number(cfg.intervalSeconds ?? 86400);

  if (!recipient || !stellarAddressSchema.safeParse(recipient).success) {
    return { shouldExecute: false, reason: "Invalid recipient in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { shouldExecute: false, reason: "Invalid amount in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return {
      shouldExecute: false,
      reason: "Invalid intervalSeconds in strategyConfig",
      nextExecutionAt: null,
    };
  }

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

  const nextExecutionAt = new Date(ctx.now.getTime() + intervalSeconds * 1000).toISOString();
  return {
    shouldExecute: true,
    recipient,
    amountXlm: amount,
    reason: "DCA interval due",
    nextExecutionAt,
  };
}
