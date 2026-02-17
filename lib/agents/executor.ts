import { buildExecute, submitSorobanTx } from "@/lib/stellar/contracts";
import {
  getAgentById,
  getAgentsByOwner,
  recordAgentExecution,
  updateAgentStrategy,
  type StoredAgent,
} from "@/lib/store/agents";
import { decideStrategy, type StrategyContext } from "./strategies";

export interface AgentExecutionResult {
  agentId: string;
  contractId: string;
  executed: boolean;
  reason?: string;
  txHash?: string;
  error?: string;
}

/** Build + (optionally) submit an execute() call for a single agent. */
export async function executeAgentOnce(options: {
  agentId: string;
  sourceAddress: string;
  /** When true, submit to Soroban RPC; when false, only build XDR. */
  submit?: boolean;
}): Promise<AgentExecutionResult & { xdr?: string }> {
  const { agentId, sourceAddress, submit = true } = options;
  const agent = getAgentById(agentId);
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
  updateAgentStrategy(agentId, {
    strategyState: decision.statePatch,
    nextExecutionAt: decision.nextExecutionAt ?? null,
  });

  if (!decision.shouldExecute) {
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason,
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
      xdr,
    };
  }

  // Submit via Soroban RPC
  try {
    const result = await submitSorobanTx(xdr);
    const nowIso = new Date().toISOString();
    recordAgentExecution(agentId, {
      lastExecutionAt: nowIso,
      nextExecutionAt: decision.nextExecutionAt ?? null,
    });

    const success = result.status === "SUCCESS" || result.status === "PENDING";

    return {
      agentId,
      contractId: agent.contractId,
      executed: success,
      reason: decision.reason,
      txHash: result.hash,
      error: success ? undefined : "Execution failed on-chain",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason,
      error: message,
    };
  }
}

/** Execute all auto-executable agents for a given owner address. */
export async function executeAllAgentsForOwner(options: {
  ownerAddress: string;
  sourceAddressOverride?: string;
  submit?: boolean;
}): Promise<AgentExecutionResult[]> {
  const { ownerAddress, sourceAddressOverride, submit = true } = options;
  const agents: StoredAgent[] = getAgentsByOwner(ownerAddress);

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

