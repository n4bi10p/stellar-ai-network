import { listExecutionLogsByAgent } from "@/lib/store/execution-logs";
import type { StoredAgent, AgentGovernance } from "@/lib/store/types";

export interface GovernanceCheckOptions {
  agent: StoredAgent;
  /** XLM amount for the transaction. Omit when triggering from a workflow
   *  orchestrator step — spend-limit checks are skipped in that case. */
  amountXlm?: number;
  submitRequested: boolean;
  approvedByOwner?: boolean;
  now?: Date;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  submitAllowed: boolean;
  reason?: string;
  governance: Required<
    Pick<
      AgentGovernance,
      | "paused"
      | "dryRunMode"
      | "requiresApproval"
      | "perExecutionLimitXlm"
      | "dailySpendLimitXlm"
    >
  >;
  todaySpentXlm?: number;
}

export function normalizeGovernance(
  governance: AgentGovernance | undefined
): Required<
  Pick<
    AgentGovernance,
    | "paused"
    | "dryRunMode"
    | "requiresApproval"
    | "perExecutionLimitXlm"
    | "dailySpendLimitXlm"
  >
> {
  return {
    paused: governance?.paused ?? false,
    dryRunMode: governance?.dryRunMode ?? false,
    requiresApproval: governance?.requiresApproval ?? false,
    perExecutionLimitXlm:
      governance?.perExecutionLimitXlm != null
        ? Number(governance.perExecutionLimitXlm)
        : null,
    dailySpendLimitXlm:
      governance?.dailySpendLimitXlm != null
        ? Number(governance.dailySpendLimitXlm)
        : null,
  };
}

function getLogAmountXlm(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const record = metadata as Record<string, unknown>;
  const value = record.amountXlm;
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export async function getAgentTodaySpentXlm(options: {
  agentId: string;
  now?: Date;
}): Promise<number> {
  const now = options.now ?? new Date();
  const startOfUtcDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const logs = await listExecutionLogsByAgent(options.agentId);

  return logs.reduce((sum, log) => {
    if (!log.success) return sum;
    const createdAt = new Date(log.createdAt);
    if (Number.isNaN(createdAt.getTime())) return sum;
    if (createdAt.getTime() < startOfUtcDay.getTime()) return sum;
    return sum + getLogAmountXlm(log.metadata);
  }, 0);
}

export async function evaluateGovernanceForExecution(
  options: GovernanceCheckOptions
): Promise<GovernanceCheckResult> {
  const governance = normalizeGovernance(options.agent.governance);

  if (governance.paused) {
    return {
      allowed: false,
      submitAllowed: false,
      reason: "Execution blocked: agent is paused",
      governance,
    };
  }

  // Spend-limit checks only apply when a concrete XLM amount is known.
  // Workflow orchestration trigger calls omit amountXlm — skip these gates.
  const hasAmount = options.amountXlm != null && Number.isFinite(options.amountXlm) && options.amountXlm > 0;

  if (options.amountXlm != null && !hasAmount) {
    // Caller explicitly passed an amount but it is invalid
    return {
      allowed: false,
      submitAllowed: false,
      reason: "Execution blocked: invalid amount",
      governance,
    };
  }

  if (
    hasAmount &&
    governance.perExecutionLimitXlm != null &&
    governance.perExecutionLimitXlm > 0 &&
    options.amountXlm! > governance.perExecutionLimitXlm
  ) {
    return {
      allowed: false,
      submitAllowed: false,
      reason: `Execution blocked: amount ${options.amountXlm} exceeds per-execution limit ${governance.perExecutionLimitXlm}`,
      governance,
    };
  }

  let todaySpentXlm = 0;
  if (hasAmount && governance.dailySpendLimitXlm != null && governance.dailySpendLimitXlm > 0) {
    todaySpentXlm = await getAgentTodaySpentXlm({
      agentId: options.agent.id,
      now: options.now,
    });

    if (todaySpentXlm + options.amountXlm! > governance.dailySpendLimitXlm) {
      return {
        allowed: false,
        submitAllowed: false,
        reason: `Execution blocked: daily spend limit ${governance.dailySpendLimitXlm} would be exceeded`,
        governance,
        todaySpentXlm,
      };
    }
  }

  if (
    governance.requiresApproval &&
    options.submitRequested &&
    !options.approvedByOwner
  ) {
    return {
      allowed: false,
      submitAllowed: false,
      reason: "Execution requires owner approval",
      governance,
      todaySpentXlm,
    };
  }

  if (governance.dryRunMode && options.submitRequested) {
    return {
      allowed: true,
      submitAllowed: false,
      reason: "Dry-run mode enabled: built transaction without submitting",
      governance,
      todaySpentXlm,
    };
  }

  return {
    allowed: true,
    submitAllowed: options.submitRequested,
    governance,
    todaySpentXlm,
  };
}
