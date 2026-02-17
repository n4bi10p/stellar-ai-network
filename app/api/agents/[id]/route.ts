// PATCH /api/agents/[id] — Update agent metadata (tx hash after deploy success)

import { NextRequest, NextResponse } from "next/server";
import { updateAgentTxHash, getAgentById } from "@/lib/store/agents";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = getAgentById(id);
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
    const { txHash } = await request.json();

    if (!txHash) {
      return NextResponse.json(
        { error: "Missing txHash" },
        { status: 400 }
      );
    }

    updateAgentTxHash(id, txHash);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
