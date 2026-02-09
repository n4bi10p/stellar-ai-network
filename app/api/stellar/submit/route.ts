import { NextRequest, NextResponse } from "next/server";
import { submitTransaction } from "@/lib/stellar/client";

export async function POST(request: NextRequest) {
  try {
    const { signedXDR } = await request.json();

    if (!signedXDR || typeof signedXDR !== "string") {
      return NextResponse.json(
        { error: "Missing 'signedXDR' field" },
        { status: 400 }
      );
    }

    const result = await submitTransaction(signedXDR);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[STELLAR/SUBMIT] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to submit transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
