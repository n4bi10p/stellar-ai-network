// POST /api/agents/toggle — Build a toggle_active transaction
// Returns unsigned XDR for wallet signing.

import { NextRequest, NextResponse } from "next/server";
import { buildToggleActive } from "@/lib/stellar/contracts";

export async function POST(request: NextRequest) {
  try {
    const { contractId, sourceAddress } = await request.json();

    if (!contractId || !sourceAddress) {
      return NextResponse.json(
        { error: "Missing required fields: contractId, sourceAddress" },
        { status: 400 }
      );
    }

    const xdr = await buildToggleActive(contractId, sourceAddress);

    return NextResponse.json({
      success: true,
      xdr,
      message: "Sign and submit this transaction to toggle agent active state.",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to build toggle transaction";
    console.error("[API agents/toggle] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
