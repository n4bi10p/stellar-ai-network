export interface StoredAgent {
  id: string; // unique UUID
  contractId: string;
  owner: string;
  name: string;
  strategy: string;
  templateId: string | null;
  createdAt: string; // ISO 8601
  txHash: string | null;

  /**
   * Strategy-specific config. Stored as plain JSON so it can be migrated to DB later (Level 5).
   * Examples:
   * - recurring_payment: { recipient, amount, intervalSeconds, maxExecutions }
   * - price_alert: { recipient, upperBound, lowerBound, alertAmount, checkIntervalSeconds }
   */
  strategyConfig?: Record<string, unknown>;

  /** Strategy runtime state (timestamps, last price, counters, etc.) */
  strategyState?: Record<string, unknown>;

  /** Auto-execution control (used later by cron in Phase 2) */
  autoExecuteEnabled?: boolean;

  /** Scheduling + telemetry */
  lastExecutionAt?: string | null; // ISO 8601
  nextExecutionAt?: string | null; // ISO 8601
  executionCount?: number; // auto executions performed
}
