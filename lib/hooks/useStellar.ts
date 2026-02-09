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
      // 1. Build unsigned transaction via API
      const buildRes = await fetch("/api/stellar/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: address, destination, amount }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json();
        throw new Error(data.error || "Failed to build transaction");
      }

      const { xdr } = await buildRes.json();

      // 2. Sign with Freighter
      const signedXdr = await signTx(xdr);

      // 3. Submit signed transaction
      const submitRes = await fetch("/api/stellar/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signedXdr }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || "Failed to submit transaction");
      }

      const result = await submitRes.json();

      // 4. Refresh balance
      await refreshBalance();

      return {
        success: true,
        hash: result.hash,
        ledger: result.ledger,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  return { sendXLM, loading };
}
