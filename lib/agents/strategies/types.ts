import type { StoredAgent } from "@/lib/store/agents";

export type StrategyId = StoredAgent["strategy"];

export interface StrategyContext {
  /** Agent record from server-side store */
  agent: StoredAgent;
  /** Current timestamp */
  now: Date;
}

export type StrategyDecision =
  | {
      shouldExecute: false;
      reason: string;
      /** When to check again (ISO). */
      nextExecutionAt?: string | null;
      /** Optional agent state updates */
      statePatch?: Record<string, unknown>;
    }
  | {
      shouldExecute: true;
      recipient: string;
      /** Amount in XLM (decimal), later converted to stroops */
      amountXlm: number;
      reason?: string;
      nextExecutionAt?: string | null;
      statePatch?: Record<string, unknown>;
    };

