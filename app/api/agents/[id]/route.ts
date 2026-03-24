// PATCH /api/agents/[id] — Update agent metadata (tx hash after deploy success)

import { NextRequest, NextResponse } from "next/server";
import {
  updateAgentTxHash,
  getAgentById,
  updateAgent,
  recordAgentExecution,
} from "@/lib/store/agents";
import { saveUserEvent } from "@/lib/store/analytics";

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
    return NextResponse.json({ agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { txHash, recordExecution, nextExecutionAt, owner } = await request.json();

    if (!txHash && !recordExecution) {
      return NextResponse.json(
        { error: "Missing txHash or recordExecution flag" },
        { status: 400 }
      );
    }

    if (txHash) {
      await updateAgentTxHash(id, txHash);
    }

    if (recordExecution) {
      await recordAgentExecution(id, {
        lastExecutionAt: new Date().toISOString(),
        nextExecutionAt: nextExecutionAt ?? null,
      });
      if (txHash) {
        await updateAgent(id, { txHash });
      }

      // Emit analytics event (non-blocking) when transaction is confirmed
      if (owner) {
        saveUserEvent(owner, "agent_executed", {
          agentId: id,
          txHash,
        }).catch(() => {}); // Silently fail if analytics unavailable
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
