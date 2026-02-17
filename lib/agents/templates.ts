// ── Agent Templates ──
// Pre-built agent configurations for common strategies.

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  strategy: string;
  /** Default parameters for this template */
  defaults: Record<string, string | number>;
  /** HUD-style icon label */
  icon: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "auto_rebalance",
    name: "Auto-Rebalancer",
    description:
      "Maintains a target asset ratio by automatically selling over-weight assets and buying under-weight assets. Runs on a configurable interval.",
    strategy: "auto_rebalance",
    defaults: {
      targetRatio: 50,
      checkInterval: 3600,
      slippage: 1,
    },
    icon: "⚖️",
  },
  {
    id: "bill_scheduler",
    name: "Bill Scheduler",
    description:
      "Executes recurring XLM payments to a fixed recipient on a set schedule. Ideal for subscriptions, salaries, or automated bill payments.",
    strategy: "recurring_payment",
    defaults: {
      amount: 10,
      intervalSeconds: 86400,
      maxExecutions: 30,
    },
    icon: "📅",
  },
  {
    id: "price_alert",
    name: "Price Alert",
    description:
      "Monitors the XLM/USD price feed and executes a pre-configured action when the price crosses a threshold. Supports both upper and lower bounds.",
    strategy: "price_alert",
    defaults: {
      upperBound: 0.5,
      lowerBound: 0.05,
      action: "send_xlm",
      alertAmount: 100,
    },
    icon: "📈",
  },
];

export function getTemplate(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}
