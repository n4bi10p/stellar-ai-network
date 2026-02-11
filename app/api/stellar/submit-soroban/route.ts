// POST /api/stellar/submit-soroban — Submit a signed Soroban transaction
// Polls Soroban RPC for confirmation and returns status.

import { NextRequest, NextResponse } from "next/server";
import { submitSorobanTx } from "@/lib/stellar/contracts";

export async function POST(request: NextRequest) {
  try {
    const { signedXDR } = await request.json();

    if (!signedXDR) {
      return NextResponse.json(
        { error: "Missing signedXDR" },
        { status: 400 }
      );
    }

    const result = await submitSorobanTx(signedXDR);

    return NextResponse.json(result);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Soroban submission failed";
    console.error("[API submit-soroban] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
