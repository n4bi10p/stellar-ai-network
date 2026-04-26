// ── Stellar SDK type re-exports & app-specific types ──

/** Wallet connection state */
export interface WalletState {
  connected: boolean;
  address: string;
  balance: string;
  loading: boolean;
  error: string;
}

/** Transaction result from sending XLM */
export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  ledger?: number;
}

/** AI-parsed command */
export interface ParsedCommand {
  action: "send_xlm" | "check_balance" | "create_agent" | "greet";
  destination?: string;
  amount?: string;
  confidence?: number;
  agentIntent?: {
    name?: string;
    strategy:
      | "auto_rebalance"
      | "recurring_payment"
      | "price_alert"
      | "dca_bot"
      | "savings_sweep"
      | "workflow_chain";
    templateId?: string;
    summary?: string;
    missingFields?: string[];
    strategyConfig: Record<string, unknown>;
  };
}

/** Chat message in the agent interface */
export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  /** Optional transaction result attached to this message */
  txResult?: TransactionResult;
  /** Optional parsed command attached to this message */
  parsedCommand?: ParsedCommand;
}

/** Agent configuration (for Level 2+ contracts) */
export interface AgentConfig {
  id: string;
  name: string;
  strategy: string;
  active: boolean;
  contractId?: string;
  owner: string;
  executions: number;
  createdAt: string;
}
