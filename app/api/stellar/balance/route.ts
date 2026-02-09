import { NextRequest, NextResponse } from "next/server";
import { fetchBalance } from "@/lib/stellar/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing 'address' query parameter" },
        { status: 400 }
      );
    }

    const balance = await fetchBalance(address);
    return NextResponse.json({ balance });
  } catch (error: unknown) {
    console.error("[STELLAR/BALANCE] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to fetch balance";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
