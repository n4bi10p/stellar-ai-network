// GET  /api/agents — List agents (optionally filtered by owner)
// POST /api/agents — Build an initialize-agent transaction + store in JSON

import { NextRequest, NextResponse } from "next/server";
import { buildInitialize } from "@/lib/stellar/contracts";
import { readAgents, addAgent, getAgentsByOwner } from "@/lib/store/agents";

export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get("owner");
    const agents = owner ? await getAgentsByOwner(owner) : await readAgents();
    return NextResponse.json({ agents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list agents";
    console.error("[API GET /agents] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { owner, name, strategy, templateId, strategyConfig } =
      await request.json();

    if (!owner || !name || !strategy) {
      return NextResponse.json(
        { error: "Missing required fields: owner, name, strategy" },
        { status: 400 }
      );
    }

    const contractId = process.env.NEXT_PUBLIC_AGENT_CONTRACT_ID;
    if (!contractId) {
      return NextResponse.json(
        { error: "Agent contract not deployed. Set NEXT_PUBLIC_AGENT_CONTRACT_ID in .env.local" },
        { status: 500 }
      );
    }

    // Build the unsigned transaction XDR for initialize()
    const xdr = await buildInitialize(contractId, owner, name, strategy, owner);

    // Persist agent metadata in server-side store (include optional strategyConfig)
    const stored = await addAgent({
      contractId,
      owner,
      name,
      strategy,
      templateId: templateId ?? null,
      txHash: null,
      strategyConfig: (strategyConfig as Record<string, unknown> | undefined) ?? undefined,
    });

    return NextResponse.json({
      success: true,
      contractId,
      agentId: stored.id,
      xdr,
      message: "Sign and submit this transaction to initialize your agent.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to build agent transaction";
    console.error("[API /agents] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
