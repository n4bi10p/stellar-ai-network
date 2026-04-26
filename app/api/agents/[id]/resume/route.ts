// POST /api/agents/[id]/resume — Resume a paused agent
// Body: { owner: string }

import { NextRequest, NextResponse } from "next/server";
import { getAgentById, updateAgent } from "@/lib/store/agents";
import { writeAuditLog } from "@/lib/agents/audit-log";
import { deleteCachedByPrefix } from "@/lib/cache/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { owner } = body as { owner?: string };

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
        { error: "Forbidden: only the agent owner can resume this agent" },
        { status: 403 }
      );
    }

    const existing = agent.governance ?? {};
    if (!existing.paused) {
      return NextResponse.json({ success: true, message: "Agent is not paused" });
    }

    const nowIso = new Date().toISOString();
    await updateAgent(id, {
      governance: {
        ...existing,
        paused: false,
        pauseReason: null,
        pausedAt: null,
      },
    });

    await writeAuditLog({
      agentId: id,
      owner,
      action: "resumed",
      details: { resumedAt: nowIso },
    });

    deleteCachedByPrefix("agents:list:");

    return NextResponse.json({
      success: true,
      message: "Agent resumed. Auto-execution can proceed.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resume agent";
    console.error("[API agents/[id]/resume] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
