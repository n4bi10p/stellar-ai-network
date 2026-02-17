import { fetchBalance } from "@/lib/stellar/client";
import { stellarAddressSchema } from "@/lib/utils/validation";
import type { StrategyContext, StrategyDecision } from "./types";

/**
 * Strategy: auto_rebalance
 *
 * Practical MVP interpretation (off-chain decision rule):
 * - Read owner's XLM balance from Horizon
 * - If balance is above target threshold, "rebalance" by invoking the agent contract's
 *   `execute(recipient, amount)` where amount = excess balance.
 *
 * Expects agent.strategyConfig keys (supports template defaults + extra fields):
 * - recipient: string (Stellar address) [required]
 * - checkInterval: number (seconds)     [template default]
 * - targetBalanceXlm?: number           [preferred; if missing, derived from targetRatio]
 * - thresholdXlm?: number               [optional; default 1]
 * - targetRatio?: number                [template default; used only if targetBalanceXlm missing]
 */
export async function decideAutoRebalance(ctx: StrategyContext): Promise<StrategyDecision> {
  const cfg = (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>;

  const recipient = typeof cfg.recipient === "string" ? cfg.recipient : "";
  const checkInterval =
    typeof cfg.checkInterval === "number" ? cfg.checkInterval : Number(cfg.checkInterval ?? 3600);

  const thresholdXlm =
    typeof cfg.thresholdXlm === "number" ? cfg.thresholdXlm : Number(cfg.thresholdXlm ?? 1);

  const targetBalanceXlmRaw =
    typeof cfg.targetBalanceXlm === "number" ? cfg.targetBalanceXlm : Number(cfg.targetBalanceXlm);

  const targetRatio =
    typeof cfg.targetRatio === "number" ? cfg.targetRatio : Number(cfg.targetRatio ?? 50);

  if (!recipient) {
    return { shouldExecute: false, reason: "Missing recipient in strategyConfig", nextExecutionAt: null };
  }
  if (!stellarAddressSchema.safeParse(recipient).success) {
    return { shouldExecute: false, reason: "Invalid recipient address in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(checkInterval) || checkInterval <= 0) {
    return { shouldExecute: false, reason: "Invalid checkInterval in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(thresholdXlm) || thresholdXlm <= 0) {
    return { shouldExecute: false, reason: "Invalid thresholdXlm in strategyConfig", nextExecutionAt: null };
  }

  // Time gating using lastExecutionAt (we treat rebalance as an execution)
  const last = ctx.agent.lastExecutionAt ? new Date(ctx.agent.lastExecutionAt) : null;
  if (last && !isNaN(last.getTime())) {
    const next = new Date(last.getTime() + checkInterval * 1000);
    if (ctx.now.getTime() < next.getTime()) {
      return { shouldExecute: false, reason: "Not due yet", nextExecutionAt: next.toISOString() };
    }
  }

  // Get current balance
  const balStr = await fetchBalance(ctx.agent.owner);
  const balance = Number.parseFloat(balStr);
  if (!Number.isFinite(balance)) {
    return { shouldExecute: false, reason: "Failed to parse owner balance", nextExecutionAt: null };
  }

  // Derive target balance if not specified.
  const targetBalanceXlm = Number.isFinite(targetBalanceXlmRaw)
    ? targetBalanceXlmRaw
    : (balance * Math.max(0, Math.min(100, targetRatio))) / 100;

  const excess = balance - targetBalanceXlm;
  if (!(excess > thresholdXlm)) {
    const nextExecutionAt = new Date(ctx.now.getTime() + checkInterval * 1000).toISOString();
    return {
      shouldExecute: false,
      reason: `No rebalance needed (excess=${excess.toFixed(7)} XLM)`,
      nextExecutionAt,
    };
  }

  // Execute "rebalance out" of the excess.
  const nextExecutionAt = new Date(ctx.now.getTime() + checkInterval * 1000).toISOString();
  return {
    shouldExecute: true,
    recipient,
    amountXlm: Number(excess.toFixed(7)), // XLM precision
    reason: `Rebalance triggered (excess=${excess.toFixed(7)} XLM)`,
    nextExecutionAt,
  };
}

