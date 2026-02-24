import { stellarAddressSchema } from "@/lib/utils/validation";
import { fetchBalance } from "@/lib/stellar/client";
import type { StrategyContext, StrategyDecision } from "./types";

/**
 * Strategy: savings_sweep
 *
 * Expects:
 * - recipient: string (vault wallet)
 * - minBalanceXlm: number (keep this much)
 * - sweepThresholdXlm: number (minimum excess to transfer)
 * - intervalSeconds: number
 */
export async function decideSavingsSweep(ctx: StrategyContext): Promise<StrategyDecision> {
  const cfg = (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>;

  const recipient = typeof cfg.recipient === "string" ? cfg.recipient : "";
  const minBalanceXlm =
    typeof cfg.minBalanceXlm === "number"
      ? cfg.minBalanceXlm
      : Number(cfg.minBalanceXlm ?? 100);
  const sweepThresholdXlm =
    typeof cfg.sweepThresholdXlm === "number"
      ? cfg.sweepThresholdXlm
      : Number(cfg.sweepThresholdXlm ?? 10);
  const intervalSeconds =
    typeof cfg.intervalSeconds === "number"
      ? cfg.intervalSeconds
      : Number(cfg.intervalSeconds ?? 86400);

  if (!recipient || !stellarAddressSchema.safeParse(recipient).success) {
    return { shouldExecute: false, reason: "Invalid recipient in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(minBalanceXlm) || minBalanceXlm < 0) {
    return { shouldExecute: false, reason: "Invalid minBalanceXlm in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(sweepThresholdXlm) || sweepThresholdXlm <= 0) {
    return {
      shouldExecute: false,
      reason: "Invalid sweepThresholdXlm in strategyConfig",
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

  const balance = Number.parseFloat(await fetchBalance(ctx.agent.owner));
  if (!Number.isFinite(balance)) {
    return { shouldExecute: false, reason: "Failed to fetch balance", nextExecutionAt: null };
  }

  const sweepAmount = balance - minBalanceXlm;
  const nextExecutionAt = new Date(ctx.now.getTime() + intervalSeconds * 1000).toISOString();

  if (sweepAmount < sweepThresholdXlm) {
    return {
      shouldExecute: false,
      reason: `No sweep needed (excess=${sweepAmount.toFixed(7)} XLM)`,
      nextExecutionAt,
    };
  }

  return {
    shouldExecute: true,
    recipient,
    amountXlm: Number(sweepAmount.toFixed(7)),
    reason: `Savings sweep triggered (${sweepAmount.toFixed(7)} XLM)` ,
    nextExecutionAt,
  };
}
