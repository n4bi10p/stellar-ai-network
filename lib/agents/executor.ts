import { buildExecute, submitSorobanTx } from "@/lib/stellar/contracts";
import {
  getAgentById,
  getAgentsByOwner,
  recordAgentExecution,
  updateAgentStrategy,
  type StoredAgent,
} from "@/lib/store/agents";
import { addExecutionLog } from "@/lib/store/execution-logs";
import { decideStrategy, type StrategyContext } from "./strategies";
import { signSorobanXdrWithSecret } from "@/lib/stellar/auto-sign";
import { resolveExecutionMode } from "@/lib/agents/modes";

export interface AgentExecutionResult {
  agentId: string;
  contractId: string;
  executed: boolean;
  reason?: string;
  nextExecutionAt?: string | null;
  txHash?: string;
  error?: string;
}

export interface AgentDueResult {
  agentId: string;
  contractId: string;
  due: boolean;
  reason?: string;
  nextExecutionAt?: string | null;
}

/** Evaluate an agent without executing. Updates strategy state + nextExecutionAt. */
export async function evaluateAgentDue(options: {
  agentId: string;
  now?: Date;
  allowManualMode?: boolean;
}): Promise<AgentDueResult> {
  const { agentId, now, allowManualMode = true } = options;
  const agent = await getAgentById(agentId);
  if (!agent) {
    return {
      agentId,
      contractId: "",
      due: false,
      reason: "Agent not found",
      nextExecutionAt: null,
    };
  }

  const mode = resolveExecutionMode(agent);
  const autoEnabled = agent.autoExecuteEnabled ?? true;
  if (!autoEnabled || (!allowManualMode && mode === "manual")) {
    return {
      agentId,
      contractId: agent.contractId,
      due: false,
      reason: !allowManualMode && mode === "manual"
        ? "Manual mode does not run on cron"
        : "Auto-execution disabled",
      nextExecutionAt: agent.nextExecutionAt ?? null,
    };
  }

  const ctx: StrategyContext = {
    agent,
    now: now ?? new Date(),
  };

  const decision = await decideStrategy(ctx);

  await updateAgentStrategy(agentId, {
    strategyState: decision.statePatch,
    nextExecutionAt: decision.nextExecutionAt ?? null,
  });

  return {
    agentId,
    contractId: agent.contractId,
    due: decision.shouldExecute,
    reason: decision.reason,
    nextExecutionAt: decision.nextExecutionAt ?? null,
  };
}

/** Build + (optionally) submit an execute() call for a single agent. */
export async function executeAgentOnce(options: {
  agentId: string;
  sourceAddress: string;
  /** When true, submit to Soroban RPC; when false, only build XDR. */
  submit?: boolean;
  signWithSecretKey?: string;
  triggerSource?: string;
}): Promise<AgentExecutionResult & { xdr?: string }> {
  const {
    agentId,
    sourceAddress,
    submit = true,
    signWithSecretKey,
    triggerSource = signWithSecretKey ? "cron_full_auto" : "manual_assisted",
  } = options;
  const agent = await getAgentById(agentId);
  if (!agent) {
    return {
      agentId,
      contractId: "",
      executed: false,
      error: "Agent not found",
    };
  }

  if (!agent.contractId) {
    return {
      agentId,
      contractId: "",
      executed: false,
      error: "Agent has no contractId",
    };
  }

  const ctx: StrategyContext = {
    agent,
    now: new Date(),
  };

  const decision = await decideStrategy(ctx);

  // Persist any state / schedule changes even when not executing
  await updateAgentStrategy(agentId, {
    strategyState: decision.statePatch,
    nextExecutionAt: decision.nextExecutionAt ?? null,
  });

  if (!decision.shouldExecute) {
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason,
      nextExecutionAt: decision.nextExecutionAt ?? null,
    };
  }

  // Convert to stroops
  const amountStroops = Math.round(decision.amountXlm * 10_000_000);
  if (!Number.isFinite(amountStroops) || amountStroops <= 0) {
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      error: "Invalid amount after conversion to stroops",
    };
  }

  // Build XDR using Soroban execute(recipient, amount) helper
  const xdr = await buildExecute(
    agent.contractId,
    decision.recipient,
    amountStroops,
    sourceAddress
  );

  if (!submit) {
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason ?? "Built XDR only (submit=false)",
      nextExecutionAt: decision.nextExecutionAt ?? null,
      xdr,
    };
  }

  // Submit via Soroban RPC
  try {
    const signedXdr = signWithSecretKey
      ? signSorobanXdrWithSecret({ xdr, secretKey: signWithSecretKey })
      : xdr;
    const result = await submitSorobanTx(signedXdr);
    const success = result.status === "SUCCESS" || result.status === "PENDING";

    await addExecutionLog({
      agentId,
      triggerSource,
      executionMode: resolveExecutionMode(agent),
      success,
      txHash: result.hash,
      failureReason: success ? null : "Execution failed on-chain",
      metadata: {
        contractId: agent.contractId,
        recipient: decision.recipient,
        amountXlm: decision.amountXlm,
        nextExecutionAt: decision.nextExecutionAt ?? null,
      },
    });

    if (success) {
      const nowIso = new Date().toISOString();
      await recordAgentExecution(agentId, {
        lastExecutionAt: nowIso,
        nextExecutionAt: decision.nextExecutionAt ?? null,
      });
    }

    return {
      agentId,
      contractId: agent.contractId,
      executed: success,
      reason: decision.reason,
      nextExecutionAt: decision.nextExecutionAt ?? null,
      txHash: result.hash,
      error: success ? undefined : "Execution failed on-chain",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await addExecutionLog({
      agentId,
      triggerSource,
      executionMode: resolveExecutionMode(agent),
      success: false,
      failureReason: message,
      metadata: {
        contractId: agent.contractId,
        recipient: decision.recipient,
        amountXlm: decision.amountXlm,
        nextExecutionAt: decision.nextExecutionAt ?? null,
      },
    });

    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason,
      nextExecutionAt: decision.nextExecutionAt ?? null,
      error: message,
    };
  }
}

export async function executeAgentWithSecret(options: {
  agentId: string;
  secretKey: string;
}): Promise<AgentExecutionResult> {
  const agent = await getAgentById(options.agentId);
  if (!agent) {
    return {
      agentId: options.agentId,
      contractId: "",
      executed: false,
      error: "Agent not found",
    };
  }

  return executeAgentOnce({
    agentId: options.agentId,
    sourceAddress: agent.owner,
    submit: true,
    signWithSecretKey: options.secretKey,
    triggerSource: "cron_full_auto",
  });
}

/** Execute all auto-executable agents for a given owner address. */
export async function executeAllAgentsForOwner(options: {
  ownerAddress: string;
  sourceAddressOverride?: string;
  submit?: boolean;
}): Promise<AgentExecutionResult[]> {
  const { ownerAddress, sourceAddressOverride, submit = true } = options;
  const agents: StoredAgent[] = await getAgentsByOwner(ownerAddress);

  const active = agents.filter(
    (a) => a.autoExecuteEnabled && a.contractId && a.strategy
  );
  if (active.length === 0) return [];

  const results: AgentExecutionResult[] = [];
  for (const agent of active) {
    const res = await executeAgentOnce({
      agentId: agent.id,
      sourceAddress: sourceAddressOverride ?? agent.owner,
      submit,
    });
    results.push(res);
  }
  return results;
}
