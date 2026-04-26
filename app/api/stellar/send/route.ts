import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/middleware/rateLimiter";
import { buildSendXLM } from "@/lib/stellar/client";
import { sendTransactionSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(buildRateLimitKey(request, "stellar:send"), {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(
        rateLimit,
        "Too many transaction build requests. Please try again shortly."
      );
    }

    const body = await request.json();

    // Validate input
    const result = sendTransactionSchema.safeParse(body);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { source, destination, amount } = result.data;

    // Build unsigned transaction XDR
    const xdr = await buildSendXLM(source, destination, amount);

    return NextResponse.json({ xdr });
  } catch (error: unknown) {
    console.error("[STELLAR/SEND] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to build transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
