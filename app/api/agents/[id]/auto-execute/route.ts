import { NextRequest, NextResponse } from "next/server";
import { getAgentsByOwner } from "@/lib/store/agents";
import { executeAgentOnce } from "@/lib/agents/executor";

// POST /api/agents/[id]/auto-execute
// - [id] is the Soroban contractId (matches /agents/[contractId] page)
// - Body: { sourceAddress: string } — must equal agent.owner for safety
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { sourceAddress } = (await request.json()) as {
      sourceAddress?: string;
    };

    if (!sourceAddress) {
      return NextResponse.json(
        { error: "Missing sourceAddress" },
        { status: 400 }
      );
    }

    // Find the MOST RECENT agent in the JSON store for this owner + contractId.
    const ownerAgents = await getAgentsByOwner(sourceAddress);
    const matching = ownerAgents.filter((a) => a.contractId === contractId);
    // Prefer the newest entry (highest createdAt)
    const agent = matching
      .slice()
      .sort((a, b) => {
        const at = new Date(a.createdAt).getTime();
        const bt = new Date(b.createdAt).getTime();
        return bt - at;
      })[0];

    if (!agent) {
      return NextResponse.json(
        {
          error:
            "Agent not found for connected wallet. Ensure you're using the owner account.",
        },
        { status: 404 }
      );
    }

    if (agent.owner !== sourceAddress) {
      return NextResponse.json(
        {
          error:
            "Connected wallet does not match agent owner. AUTO_EXECUTE_NOW requires the owner account.",
        },
        { status: 403 }
      );
    }

    const result = await executeAgentOnce({
      agentId: agent.id,
      sourceAddress,
      submit: true,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API agents/[id]/auto-execute] Error:", msg);
    return NextResponse.json(
      { error: "Auto execution failed", message: msg },
      { status: 500 }
    );
  }
}
