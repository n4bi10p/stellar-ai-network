// PATCH /api/agents/[id]/governance — Update governance settings
// GET  /api/agents/[id]/governance — Fetch current governance config + audit log
// Body: { owner, perExecutionLimitXlm?, dailySpendLimitXlm?, dryRunMode?, requiresApproval? }

import { NextRequest, NextResponse } from "next/server";
import { getAgentById, updateAgent } from "@/lib/store/agents";
import { writeAuditLog, getAuditLog } from "@/lib/agents/audit-log";
import { deleteCachedByPrefix } from "@/lib/cache/cache";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const auditLog = await getAuditLog(id);

    return NextResponse.json({
      governance: agent.governance ?? {},
      auditLog,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch governance";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      owner,
      perExecutionLimitXlm,
      dailySpendLimitXlm,
      dryRunMode,
      requiresApproval,
    } = body as {
      owner?: string;
      perExecutionLimitXlm?: number | null;
      dailySpendLimitXlm?: number | null;
      dryRunMode?: boolean;
      requiresApproval?: boolean;
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
        { error: "Forbidden: only the agent owner can update governance" },
        { status: 403 }
      );
    }

    const existing = agent.governance ?? {};
    const changes: Record<string, unknown> = {};

    if (perExecutionLimitXlm !== undefined) changes.perExecutionLimitXlm = perExecutionLimitXlm;
    if (dailySpendLimitXlm !== undefined) changes.dailySpendLimitXlm = dailySpendLimitXlm;
    if (dryRunMode !== undefined) changes.dryRunMode = dryRunMode;
    if (requiresApproval !== undefined) changes.requiresApproval = requiresApproval;

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "No governance fields provided to update" },
        { status: 400 }
      );
    }

    const updated = { ...existing, ...changes };
    await updateAgent(id, { governance: updated });

    await writeAuditLog({
      agentId: id,
      owner,
      action: "governance_updated",
      details: { changes, previousGovernance: existing },
    });

    deleteCachedByPrefix("agents:list:");

    return NextResponse.json({ success: true, governance: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update governance";
    console.error("[API agents/[id]/governance] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
