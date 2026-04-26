// POST /api/agents/[id]/dry-run — Simulate an execution without submitting
// Body: { owner: string, amountXlm: number, recipient?: string }
// Returns full governance decision trace for UI display.

import { NextRequest, NextResponse } from "next/server";
import { getAgentById } from "@/lib/store/agents";
import { evaluateGovernanceForExecution } from "@/lib/agents/governance";
import { writeAuditLog } from "@/lib/agents/audit-log";
import { decideStrategy, type StrategyContext } from "@/lib/agents/strategies";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { owner, amountXlm, recipient } = body as {
      owner?: string;
      amountXlm?: number;
      recipient?: string;
    };

    if (!owner) {
      return NextResponse.json(
        { error: "Missing required field: owner" },
        { status: 400 }
      );
    }

    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.owner !== owner) {
      return NextResponse.json(
        { error: "Forbidden: only the agent owner can dry-run this agent" },
        { status: 403 }
      );
    }

    // Resolve the actual amount from strategy if not provided
    let resolvedAmountXlm = amountXlm;
    let resolvedRecipient = recipient;

    if (!resolvedAmountXlm || !resolvedRecipient) {
      const ctx: StrategyContext = { agent, now: new Date() };
      const decision = await decideStrategy(ctx);
      if (decision.shouldExecute) {
        resolvedAmountXlm = resolvedAmountXlm ?? decision.amountXlm;
        resolvedRecipient = resolvedRecipient ?? decision.recipient;
      }
    }

    const amountNum = Number(resolvedAmountXlm ?? 0);

    // Run governance checks without any side effects
    const govResult = await evaluateGovernanceForExecution({
      agent,
      amountXlm: amountNum,
      submitRequested: true,
      approvedByOwner: false,
    });

    await writeAuditLog({
      agentId: id,
      owner,
      action: "dry_run_executed",
      details: {
        amountXlm: amountNum,
        recipient: resolvedRecipient,
        wouldExecute: govResult.allowed && govResult.submitAllowed,
        blockedReason: govResult.reason,
        governanceSnapshot: govResult.governance,
      },
    });

    return NextResponse.json({
      dryRun: true,
      wouldExecute: govResult.allowed && govResult.submitAllowed,
      blockedReason: govResult.reason,
      governance: govResult.governance,
      todaySpentXlm: govResult.todaySpentXlm,
      simulatedAction: {
        agentId: id,
        amountXlm: amountNum,
        recipient: resolvedRecipient,
        strategy: agent.strategy,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dry-run failed";
    console.error("[API agents/[id]/dry-run] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
