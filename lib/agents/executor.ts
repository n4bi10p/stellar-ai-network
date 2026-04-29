import { buildExecute, submitSorobanTx } from "@/lib/stellar/contracts";
import * as StellarSdk from "@stellar/stellar-sdk";
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
import { parseWorkflowChainConfig } from "@/lib/utils/validation";
import {
  buildWorkflowChainLogMetadata,
  buildWorkflowChainSuccessStatePatch,
} from "./strategies/workflow_chain";
import { retryWithBackoff } from "@/lib/scheduler/retry";
import { evaluateGovernanceForExecution } from "@/lib/agents/governance";
import { writeAuditLog } from "@/lib/agents/audit-log";
import {
  getAgentSponsorshipConfig,
  getSponsorAccountWithSecret,
  recordSponsoredTransaction,
  updateSponsoredTransactionStatus,
} from "@/lib/store/sponsorship";
import { getPrismaClient } from "@/lib/db/client";

const db = getPrismaClient();

export interface AgentExecutionResult {
  agentId: string;
  contractId: string;
  executed: boolean;
  reason?: string;
  nextExecutionAt?: string | null;
  txHash?: string;
  error?: string;
  logMetadata?: Record<string, unknown>;
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
  const workflowConfig =
    agent.strategy === "workflow_chain"
      ? parseWorkflowChainConfig(
          (agent.strategyConfig ?? {}) as Record<string, unknown>
        )
      : null;
  const observedBalanceXlm =
    typeof decision.statePatch?.lastObservedBalanceXlm === "number"
      ? decision.statePatch.lastObservedBalanceXlm
      : Number(decision.statePatch?.lastObservedBalanceXlm ?? NaN);

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

  // ── Governance gate ─────────────────────────────────────────────────────
  // Use a preliminary amount estimate (strategy config or 0) for spend-limit
  // pre-check. The exact amount is resolved after strategy evaluation.
  const preliminaryAmount =
    typeof agent.strategyConfig?.amount === "number"
      ? (agent.strategyConfig.amount as number)
      : typeof agent.strategyConfig?.amount === "string"
      ? parseFloat(agent.strategyConfig.amount as string)
      : 0;

  const govCheck = await evaluateGovernanceForExecution({
    agent,
    amountXlm: Number.isFinite(preliminaryAmount) && preliminaryAmount > 0
      ? preliminaryAmount
      : 0,
    submitRequested: submit,
  });

  if (!govCheck.allowed) {
    await writeAuditLog({
      agentId,
      owner: agent.owner,
      action: "spend_limit_blocked",
      details: { reason: govCheck.reason, governanceSnapshot: govCheck.governance },
    });
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: govCheck.reason ?? "Blocked by governance policy",
    };
  }
  // ────────────────────────────────────────────────────────────────────────

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

  // ── Fee Sponsorship Check ─────────────────────────────────────────────────
  let sponsorshipConfig: any = undefined;
  const agentSponsorshipConfig = await getAgentSponsorshipConfig(agentId);
  if (agentSponsorshipConfig?.enabled) {
    // Get sponsor account with decrypted secret key (server-side only)
    const sponsorAccount = await db.sponsorAccount.findFirst({
      where: { address: agentSponsorshipConfig.sponsorAddress },
    });

    if (sponsorAccount) {
      const decryptedSponsor = await getSponsorAccountWithSecret(
        sponsorAccount.id
      );
      if (decryptedSponsor) {
        sponsorshipConfig = {
          ...agentSponsorshipConfig,
          sponsorSecretKey: decryptedSponsor.secretKey,
        };
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  // Build XDR using Soroban execute(recipient, amount) helper
  // Optionally applies fee-bump sponsorship
  const xdr = await buildExecute(
    agent.contractId,
    decision.recipient,
    amountStroops,
    sourceAddress,
    sponsorshipConfig
  );

  const workflowSuccessStatePatch =
    workflowConfig && Number.isFinite(observedBalanceXlm)
      ? buildWorkflowChainSuccessStatePatch({
          checkedAt:
            typeof decision.statePatch?.lastCheckedAt === "string"
              ? decision.statePatch.lastCheckedAt
              : ctx.now.toISOString(),
          observedBalanceXlm,
        })
      : null;

  const logMetadata: Record<string, unknown> = {
    contractId: agent.contractId,
    recipient: decision.recipient,
    amountXlm: decision.amountXlm,
    nextExecutionAt: decision.nextExecutionAt ?? null,
  };

  if (workflowConfig && workflowSuccessStatePatch && Number.isFinite(observedBalanceXlm)) {
    logMetadata.workflow = buildWorkflowChainLogMetadata({
      config: workflowConfig,
      observedBalanceXlm,
      reason: decision.reason,
      actionStatus: submit ? "submitted" : "built",
      successStatePatch: workflowSuccessStatePatch,
    });
  }

  if (!submit) {
    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason ?? "Built XDR only (submit=false)",
      nextExecutionAt: decision.nextExecutionAt ?? null,
      logMetadata,
      xdr,
    };
  }

  // Submit via Soroban RPC
  try {
    const signedXdr = signWithSecretKey
      ? signSorobanXdrWithSecret({ xdr, secretKey: signWithSecretKey })
      : xdr;
    const result = await retryWithBackoff(() => submitSorobanTx(signedXdr));
    const success = result.status === "SUCCESS" || result.status === "PENDING";

    // ── Record Sponsored Transaction ──────────────────────────────────────
    if (sponsorshipConfig && agentSponsorshipConfig?.sponsorAddress) {
      const sponsorAccount = await db.sponsorAccount.findFirst({
        where: { address: agentSponsorshipConfig.sponsorAddress },
      });

      if (sponsorAccount && result.hash) {
        try {
          await recordSponsoredTransaction({
            txHash: result.hash,
            agentId,
            sponsorId: sponsorAccount.id,
            feePaid: result.feeSpent || StellarSdk.BASE_FEE * 2, // Fallback to estimate
            baseFee: StellarSdk.BASE_FEE,
            originalXdr: xdr,
            feeBumpXdr: xdr, // Both are same if fee-bump was applied
            metadata: {
              status: result.status,
              executionMode: resolveExecutionMode(agent),
            },
          });

          // Update status after confirmation
          if (success) {
            await updateSponsoredTransactionStatus(result.hash, "success");
          } else if (result.status === "FAILED") {
            await updateSponsoredTransactionStatus(result.hash, "failed");
          }
        } catch (sponsorError) {
          console.warn(
            "Failed to record sponsored transaction:",
            sponsorError
          );
          // Don't fail the overall execution if sponsorship recording fails
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    await addExecutionLog({
      agentId,
      triggerSource,
      executionMode: resolveExecutionMode(agent),
      success,
      txHash: result.hash,
      failureReason: success ? null : "Execution failed on-chain",
      metadata: {
        ...logMetadata,
        sponsored: !!sponsorshipConfig,
        workflow:
          workflowConfig && workflowSuccessStatePatch && Number.isFinite(observedBalanceXlm)
            ? buildWorkflowChainLogMetadata({
                config: workflowConfig,
                observedBalanceXlm,
                reason: decision.reason,
                actionStatus: success ? "submitted" : "failed",
                successStatePatch: workflowSuccessStatePatch,
              })
            : logMetadata.workflow,
      },
    });

    if (success) {
      if (workflowSuccessStatePatch) {
        await updateAgentStrategy(agentId, {
          strategyState: workflowSuccessStatePatch,
          nextExecutionAt: decision.nextExecutionAt ?? null,
        });
      }
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
      logMetadata,
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
        ...logMetadata,
        workflow:
          workflowConfig && workflowSuccessStatePatch && Number.isFinite(observedBalanceXlm)
            ? buildWorkflowChainLogMetadata({
                config: workflowConfig,
                observedBalanceXlm,
                reason: decision.reason,
                actionStatus: "failed",
                successStatePatch: workflowSuccessStatePatch,
              })
            : logMetadata.workflow,
      },
    });

    return {
      agentId,
      contractId: agent.contractId,
      executed: false,
      reason: decision.reason,
      nextExecutionAt: decision.nextExecutionAt ?? null,
      error: message,
      logMetadata,
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
