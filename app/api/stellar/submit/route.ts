import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/middleware/rateLimiter";
import { submitTransaction } from "@/lib/stellar/client";
import { saveExecutionEvent } from "@/lib/store/analytics";

export async function POST(request: NextRequest) {
  let agentId: string | undefined;
  let walletAddress: string | undefined;

  try {
    const rateLimit = checkRateLimit(buildRateLimitKey(request, "stellar:submit"), {
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(
        rateLimit,
        "Too many transaction submission requests. Please try again shortly."
      );
    }

    const body = await request.json();
    const { signedXDR, agentId: bodyAgentId, walletAddress: bodyWalletAddress } = body;

    // Store for error handling
    agentId = bodyAgentId;
    walletAddress = bodyWalletAddress;

    if (!signedXDR || typeof signedXDR !== "string") {
      return NextResponse.json(
        { error: "Missing 'signedXDR' field" },
        { status: 400 }
      );
    }

    const result = await submitTransaction(signedXDR);

    // Record execution event for ALL transactions (agent or manual)
    if (walletAddress && result) {
      const txType = agentId ? "agent_execution" : "manual_transfer";
      const executionAgentId = agentId ?? null;
      
      saveExecutionEvent(
        walletAddress,
        executionAgentId,
        "success",
        result.hash || undefined,
        undefined,
        { 
          ledger: result.ledger,
          transactionType: txType,
          timestamp: new Date().toISOString()
        }
      ).then(() => {
        console.log(`[STELLAR/SUBMIT] ExecutionEvent recorded (${txType}): agent=${executionAgentId ?? "manual"}, tx=${result.hash}`);
      }).catch((err) => {
        console.error(`[STELLAR/SUBMIT] Failed to save ExecutionEvent:`, err instanceof Error ? err.message : String(err));
      });
    } else if (!walletAddress) {
      console.warn(`[STELLAR/SUBMIT] No walletAddress provided, skipping ExecutionEvent`);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[STELLAR/SUBMIT] Error:", error);

    // Try to record failure event if we have wallet info
    if (walletAddress) {
      const txType = agentId ? "agent_execution" : "manual_transfer";
      const executionAgentId = agentId ?? null;
      
      saveExecutionEvent(
        walletAddress,
        executionAgentId,
        "failed",
        undefined,
        error instanceof Error ? error.message : String(error),
        {
          transactionType: txType,
          timestamp: new Date().toISOString()
        }
      ).catch(() => {});
    }

    const msg =
      error instanceof Error ? error.message : "Failed to submit transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
