// POST /api/agents/[id]/pause — Emergency-pause an agent
// Body: { owner: string, reason?: string }

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
    const { owner, reason } = body as { owner?: string; reason?: string };

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

    // Owner-only guard
    if (agent.owner !== owner) {
      return NextResponse.json(
        { error: "Forbidden: only the agent owner can pause this agent" },
        { status: 403 }
      );
    }

    const existing = agent.governance ?? {};
    if (existing.paused) {
      return NextResponse.json({ success: true, message: "Agent is already paused" });
    }

    const nowIso = new Date().toISOString();
    await updateAgent(id, {
      governance: {
        ...existing,
        paused: true,
        pauseReason: reason ?? "Emergency pause requested by owner",
        pausedAt: nowIso,
      },
    });

    await writeAuditLog({
      agentId: id,
      owner,
      action: "paused",
      details: { reason: reason ?? "Emergency pause requested by owner", pausedAt: nowIso },
    });

    deleteCachedByPrefix("agents:list:");

    return NextResponse.json({
      success: true,
      message: "Agent paused. No further executions will run until resumed.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to pause agent";
    console.error("[API agents/[id]/pause] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
