import type { StrategyContext, StrategyDecision } from "./types";
import { buildPathPaymentStrictSend } from "@/lib/stellar/path-payment";
import { HORIZON_URL } from "@/lib/utils/constants";

export async function decideSwap(
  ctx: StrategyContext
): Promise<StrategyDecision> {
  const config = ctx.agent.strategyConfig as Record<string, unknown> | undefined;
  if (!config) {
    return { shouldExecute: false, reason: "Missing strategy config", nextExecutionAt: null };
  }

  const {
    tokenIn,
    tokenOut,
    amountIn,
    slippageBps = 50,
    triggerType = "manual", // manual, scheduled, price_condition
    intervalSeconds,
    priceCondition, // { operator: ">" | "<", targetPrice: number }
  } = config;

  if (!tokenIn || typeof tokenIn !== "string" || !tokenOut || typeof tokenOut !== "string") {
    return { shouldExecute: false, reason: "Missing tokenIn or tokenOut config", nextExecutionAt: null };
  }

  const amountStr = String(amountIn);
  if (!amountIn || Number.isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
    return { shouldExecute: false, reason: "Invalid amountIn config", nextExecutionAt: null };
  }

  // 1. Evaluate Triggers
  let shouldTrigger = false;
  let reason = "Conditions not met";
  let nextExecutionAt: string | null = null;

  if (triggerType === "manual") {
    shouldTrigger = true;
    reason = "Manual execution triggered";
  } else if (triggerType === "scheduled" && typeof intervalSeconds === "number") {
    const lastExecAt = ctx.agent.lastExecutionAt
      ? new Date(ctx.agent.lastExecutionAt).getTime()
      : 0;
    if (ctx.now.getTime() >= lastExecAt + intervalSeconds * 1000) {
      shouldTrigger = true;
      reason = `Scheduled interval of ${intervalSeconds}s elapsed`;
    } else {
      nextExecutionAt = new Date(lastExecAt + intervalSeconds * 1000).toISOString();
      reason = `Waiting for next scheduled interval`;
    }
  } else if (triggerType === "price_condition" && priceCondition && typeof priceCondition === "object") {
    // Basic price condition check (e.g. limit order behavior)
    // We fetch the current exchange rate using strictSendPaths and an amount of 1 tokenIn
    try {
      const server = new (await import("@stellar/stellar-sdk")).Horizon.Server(HORIZON_URL);
      const { parseAsset } = await import("@/lib/stellar/path-payment");
      const pathReq = await server.strictSendPaths(parseAsset(tokenIn as string), "1", [parseAsset(tokenOut as string)]).call();
      if (pathReq.records.length > 0) {
        const sortedPaths = pathReq.records.sort((a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
        const currentPrice = parseFloat(sortedPaths[0].destination_amount); // amount of tokenOut per 1 tokenIn
        
        const { operator, targetPrice } = priceCondition as any;
        if (operator === ">" && currentPrice > targetPrice) {
          shouldTrigger = true;
          reason = `Price ${currentPrice} is greater than target ${targetPrice}`;
        } else if (operator === "<" && currentPrice < targetPrice) {
          shouldTrigger = true;
          reason = `Price ${currentPrice} is less than target ${targetPrice}`;
        } else {
          reason = `Price ${currentPrice} does not meet condition ${operator} ${targetPrice}`;
        }
      } else {
        reason = "No liquidity found to evaluate price condition";
      }
    } catch (err) {
      reason = `Failed to evaluate price condition: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (!shouldTrigger) {
    return { shouldExecute: false, reason, nextExecutionAt };
  }

  // Calculate next execution for scheduled triggers if it successfully executed
  if (triggerType === "scheduled" && typeof intervalSeconds === "number") {
    nextExecutionAt = new Date(ctx.now.getTime() + intervalSeconds * 1000).toISOString();
  } else if (triggerType === "price_condition") {
    // Polling interval for price condition
    nextExecutionAt = new Date(ctx.now.getTime() + 60 * 1000).toISOString(); 
  }

  return {
    shouldExecute: true,
    recipient: ctx.agent.owner, // Swaps to self
    amountXlm: tokenIn === "native" ? parseFloat(amountStr) : 0, // XLM deduction for spend limits
    reason,
    nextExecutionAt,
    xdrBuilder: async (sourceAddress: string) => {
      const result = await buildPathPaymentStrictSend({
        sourceAddress,
        sendAsset: tokenIn as string,
        sendAmount: amountStr,
        destAsset: tokenOut as string,
        slippageBps: typeof slippageBps === "number" ? slippageBps : 50,
      });
      return result.xdr;
    },
  };
}
