// POST /api/agents — Build an initialize-agent transaction
// The frontend signs it via wallet and submits via /api/stellar/submit-soroban

import { NextRequest, NextResponse } from "next/server";
import { buildInitialize } from "@/lib/stellar/contracts";

export async function POST(request: NextRequest) {
  try {
    const { owner, name, strategy } = await request.json();

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

    return NextResponse.json({
      success: true,
      contractId,
      xdr,
      message: "Sign and submit this transaction to initialize your agent.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to build agent transaction";
    console.error("[API /agents] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
