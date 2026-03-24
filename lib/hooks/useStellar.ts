"use client";

import { useState } from "react";
import { useWallet } from "./useWallet";
import type { TransactionResult } from "@/lib/stellar/types";

export function useStellar() {
  const [loading, setLoading] = useState(false);
  const { address, signTx, refreshBalance } = useWallet();

  async function sendXLM(
    destination: string,
    amount: string
  ): Promise<TransactionResult> {
    setLoading(true);
    try {
      console.log("[useStellar] Starting XLM send...", { destination, amount });
      
      // 1. Build unsigned transaction via API
      const buildRes = await fetch("/api/stellar/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: address, destination, amount }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json().catch(() => ({}));
        throw new Error(data.error || `Build failed (${buildRes.status})`);
      }

      const { xdr } = await buildRes.json();
      console.log("[useStellar] Got unsigned XDR, requesting user signature...");

      // 2. Sign with connected wallet (Albedo, Freighter, Rabet, XBull)
      const signedXdr = await signTx(xdr);
      console.log("[useStellar] Transaction signed successfully");

      // 3. Submit signed transaction
      const submitRes = await fetch("/api/stellar/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signedXdr }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        throw new Error(data.error || `Submit failed (${submitRes.status})`);
      }

      const result = await submitRes.json();
      console.log("[useStellar] Transaction submitted:", result);

      // 4. Refresh balance
      await refreshBalance();

      return {
        success: true,
        hash: result.hash,
        ledger: result.ledger,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      console.error("[useStellar] Error:", msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  return { sendXLM, loading };
}
