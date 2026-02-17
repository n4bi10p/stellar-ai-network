import type { StrategyContext, StrategyDecision, StrategyId } from "./types";
import { decideRecurringPayment } from "./recurring_payment";
import { decidePriceAlert } from "./price_alert";
import { decideAutoRebalance } from "./auto_rebalance";

export { StrategyContext, StrategyDecision, StrategyId } from "./types";

export async function decideStrategy(
  ctx: StrategyContext
): Promise<StrategyDecision> {
  const id = ctx.agent.strategy as StrategyId;

  if (id === "recurring_payment") return decideRecurringPayment(ctx);
  if (id === "price_alert") return decidePriceAlert(ctx);
  if (id === "auto_rebalance") return decideAutoRebalance(ctx);

  return { shouldExecute: false, reason: `Unknown strategy: ${String(id)}`, nextExecutionAt: null };
}

