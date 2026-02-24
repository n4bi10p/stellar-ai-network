import { NextRequest, NextResponse } from "next/server";
import { setKeyConsent } from "@/lib/security/key-vault";
import { getAgentById } from "@/lib/store/agents";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = (await request.json()) as { accepted?: boolean; policyVersion?: string };
    if (typeof body.accepted !== "boolean") {
      return NextResponse.json({ error: "Missing accepted boolean" }, { status: 400 });
    }

    await setKeyConsent({
      agentId: id,
      accepted: body.accepted,
      policyVersion: body.policyVersion,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save key consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
