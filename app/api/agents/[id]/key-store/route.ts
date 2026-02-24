import { NextRequest, NextResponse } from "next/server";
import { getAgentById } from "@/lib/store/agents";
import { storeEncryptedKey, revokeEncryptedKey } from "@/lib/security/key-vault";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    if ((process.env.ENABLE_FULL_AUTO ?? "false") !== "true") {
      return NextResponse.json({ error: "Full auto is disabled" }, { status: 403 });
    }

    if (agent.executionMode !== "full_auto") {
      return NextResponse.json({ error: "Agent must be in full_auto mode" }, { status: 400 });
    }

    const body = (await request.json()) as { secretKey?: string };
    if (!body.secretKey) {
      return NextResponse.json({ error: "Missing secretKey" }, { status: 400 });
    }

    await storeEncryptedKey({ agentId: id, secretKey: body.secretKey });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to store key";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    await revokeEncryptedKey(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to revoke key";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
