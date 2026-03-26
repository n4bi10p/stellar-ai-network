// POST /api/stellar/submit-soroban — Submit a signed Soroban transaction
// Polls Soroban RPC for confirmation and returns status.

import { NextRequest, NextResponse } from "next/server";
import { submitSorobanTx } from "@/lib/stellar/contracts";
import { saveExecutionEvent } from "@/lib/store/analytics";

export async function POST(request: NextRequest) {
  let agentId: string | undefined;
  let walletAddress: string | undefined;

  try {
    const body = await request.json();
    const { signedXDR, agentId: bodyAgentId, walletAddress: bodyWalletAddress } = body;

    // Store for error handling
    agentId = bodyAgentId;
    walletAddress = bodyWalletAddress;

    if (!signedXDR) {
      return NextResponse.json(
        { error: "Missing signedXDR" },
        { status: 400 }
      );
    }

    const result = await submitSorobanTx(signedXDR);

    // Record execution event for ALL transactions (agent or manual Soroban call)
    if (walletAddress && result) {
      const txType = agentId ? "agent_execution" : "manual_soroban";
      const executionAgentId = agentId || `soroban_${walletAddress.slice(0, 8)}`;
      
      saveExecutionEvent(
        walletAddress,
        executionAgentId,
        result.status === "FAILED" ? "failed" : "success",
        result.hash || undefined,
        result.status === "FAILED" ? result.resultXdr : undefined,
        {
          txStatus: result.status,
          ledger: result.ledger,
          transactionType: txType,
          timestamp: new Date().toISOString()
        }
      ).then(() => {
        console.log(`[SOROBAN/SUBMIT] ExecutionEvent recorded (${txType}): agent=${executionAgentId}, tx=${result.hash}, status=${result.status}`);
      }).catch((err) => {
        console.error(`[SOROBAN/SUBMIT] Failed to save ExecutionEvent:`, err instanceof Error ? err.message : String(err));
      });
    } else if (!walletAddress) {
      console.warn(`[SOROBAN/SUBMIT] No walletAddress provided, skipping ExecutionEvent`);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API submit-soroban] Error:", err);

    // Try to record failure event if we have wallet info
    if (walletAddress) {
      const txType = agentId ? "agent_execution" : "manual_soroban";
      const executionAgentId = agentId || `soroban_${walletAddress.slice(0, 8)}`;
      
      saveExecutionEvent(
        walletAddress,
        executionAgentId,
        "failed",
        undefined,
        err instanceof Error ? err.message : String(err),
        {
          transactionType: txType,
          timestamp: new Date().toISOString()
        }
      ).catch(() => {});
    }

    const msg =
      err instanceof Error ? err.message : "Soroban submission failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
