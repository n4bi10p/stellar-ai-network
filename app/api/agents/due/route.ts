import { NextRequest, NextResponse } from "next/server";
import { getAgentsByOwner } from "@/lib/store/agents";
import { evaluateAgentDue } from "@/lib/agents/executor";

export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get("owner");
    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner query param" },
        { status: 400 }
      );
    }

    const agents = await getAgentsByOwner(owner);
    const results = await Promise.all(
      agents.map((agent) =>
        evaluateAgentDue({ agentId: agent.id, now: new Date() })
      )
    );

    const due = results.filter((r) => r.due);

    return NextResponse.json({ due });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to compute due agents";
    console.error("[API /agents/due] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
