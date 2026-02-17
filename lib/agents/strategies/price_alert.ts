import { stellarAddressSchema } from "@/lib/utils/validation";
import type { StrategyContext, StrategyDecision } from "./types";

async function fetchXlmUsdPrice(): Promise<number> {
  // CoinGecko simple price (no key required for low-volume usage)
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
    { headers: { "accept": "application/json" } }
  );
  if (!res.ok) throw new Error(`Price API error: ${res.status}`);
  const data = (await res.json()) as { stellar?: { usd?: number } };
  const price = data?.stellar?.usd;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new Error("Invalid price API response");
  }
  return price;
}

/**
 * Strategy: price_alert
 *
 * Expects agent.strategyConfig keys:
 * - recipient: string (Stellar address)  [required for send_xlm action]
 * - alertAmount: number (XLM)
 * - upperBound?: number (USD)
 * - lowerBound?: number (USD)
 * - checkIntervalSeconds?: number
 *
 * Stores runtime state in agent.strategyState:
 * - lastCheckedAt: ISO string
 * - lastPriceUsd: number
 */
export async function decidePriceAlert(ctx: StrategyContext): Promise<StrategyDecision> {
  const cfg = (ctx.agent.strategyConfig ?? {}) as Record<string, unknown>;
  const state = (ctx.agent.strategyState ?? {}) as Record<string, unknown>;

  const recipient = typeof cfg.recipient === "string" ? cfg.recipient : "";
  const alertAmount =
    typeof cfg.alertAmount === "number" ? cfg.alertAmount : Number(cfg.alertAmount);
  const upperBound =
    typeof cfg.upperBound === "number"
      ? cfg.upperBound
      : cfg.upperBound == null
      ? undefined
      : Number(cfg.upperBound);
  const lowerBound =
    typeof cfg.lowerBound === "number"
      ? cfg.lowerBound
      : cfg.lowerBound == null
      ? undefined
      : Number(cfg.lowerBound);
  const checkIntervalSeconds =
    typeof cfg.checkIntervalSeconds === "number"
      ? cfg.checkIntervalSeconds
      : Number(cfg.checkIntervalSeconds ?? 300);

  if (!Number.isFinite(alertAmount) || alertAmount <= 0) {
    return { shouldExecute: false, reason: "Invalid alertAmount in strategyConfig", nextExecutionAt: null };
  }
  if (
    (upperBound === undefined || !Number.isFinite(upperBound)) &&
    (lowerBound === undefined || !Number.isFinite(lowerBound))
  ) {
    return { shouldExecute: false, reason: "Missing upperBound/lowerBound in strategyConfig", nextExecutionAt: null };
  }
  if (!Number.isFinite(checkIntervalSeconds) || checkIntervalSeconds <= 0) {
    return { shouldExecute: false, reason: "Invalid checkIntervalSeconds in strategyConfig", nextExecutionAt: null };
  }

  // Throttle checks
  const lastCheckedAt = typeof state.lastCheckedAt === "string" ? state.lastCheckedAt : null;
  if (lastCheckedAt) {
    const last = new Date(lastCheckedAt);
    if (!isNaN(last.getTime())) {
      const next = new Date(last.getTime() + checkIntervalSeconds * 1000);
      if (ctx.now.getTime() < next.getTime()) {
        return {
          shouldExecute: false,
          reason: "Not due for price check yet",
          nextExecutionAt: next.toISOString(),
        };
      }
    }
  }

  // Fetch price now
  const priceUsd = await fetchXlmUsdPrice();
  const nextExecutionAt = new Date(ctx.now.getTime() + checkIntervalSeconds * 1000).toISOString();

  const shouldTriggerUpper = upperBound !== undefined && priceUsd >= upperBound;
  const shouldTriggerLower = lowerBound !== undefined && priceUsd <= lowerBound;

  const statePatch = { lastCheckedAt: ctx.now.toISOString(), lastPriceUsd: priceUsd };

  if (!shouldTriggerUpper && !shouldTriggerLower) {
    return {
      shouldExecute: false,
      reason: `Price ${priceUsd} did not cross threshold`,
      nextExecutionAt,
      statePatch,
    };
  }

  if (!recipient) {
    return {
      shouldExecute: false,
      reason: "Missing recipient in strategyConfig",
      nextExecutionAt,
      statePatch,
    };
  }
  if (!stellarAddressSchema.safeParse(recipient).success) {
    return {
      shouldExecute: false,
      reason: "Invalid recipient address in strategyConfig",
      nextExecutionAt,
      statePatch,
    };
  }

  return {
    shouldExecute: true,
    recipient,
    amountXlm: alertAmount,
    reason: shouldTriggerUpper
      ? `Price >= upperBound (${priceUsd} >= ${upperBound})`
      : `Price <= lowerBound (${priceUsd} <= ${lowerBound})`,
    nextExecutionAt,
    statePatch,
  };
}

