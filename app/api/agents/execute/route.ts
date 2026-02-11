// POST /api/agents/execute — Build an execute-agent transaction
// Returns unsigned XDR for wallet signing.

import { NextRequest, NextResponse } from "next/server";
import { buildExecute } from "@/lib/stellar/contracts";

export async function POST(request: NextRequest) {
  try {
    const { contractId, recipient, amount, sourceAddress } =
      await request.json();

    if (!contractId || !recipient || !amount || !sourceAddress) {
      return NextResponse.json(
        { error: "Missing required fields: contractId, recipient, amount, sourceAddress" },
        { status: 400 }
      );
    }

    const amountStroops = Math.round(parseFloat(amount) * 10_000_000);

    const xdr = await buildExecute(
      contractId,
      recipient,
      amountStroops,
      sourceAddress
    );

    return NextResponse.json({
      success: true,
      xdr,
      message: "Sign and submit this transaction to execute agent action.",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to build execute transaction";
    console.error("[API agents/execute] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
