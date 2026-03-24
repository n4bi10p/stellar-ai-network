// ── Albedo Wallet Adapter ──
// Albedo is a web-based Stellar wallet that communicates via popups.
// Mobile: Recommended for iOS/Android
// SDK: @albedo-link/intent

import albedo from "@albedo-link/intent";
import type { WalletProvider, WalletMeta } from "./types";

const meta: WalletMeta = {
  id: "albedo",
  name: "Albedo",
  description: "Mobile-friendly Stellar signer — no extension needed",
  installUrl: "https://albedo.link/",
  icon: "🌐",
  platforms: ["desktop", "mobile"],
  connectionMethod: "popup",
  badgeLabel: "RECOMMENDED FOR MOBILE",
};

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Mobile gets more time since it's going through popup flow
const ALBEDO_TIMEOUT_MS = isMobileBrowser() ? 20_000 : 15_000;

async function withAlbedoTimeout<T>(
  promise: Promise<T>,
  action: string,
  retryCount: number = 0
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    // For mobile, force focus on wallet app by logging to console
    if (isMobileBrowser()) {
      console.log(`[Albedo] Opening ${action} popup. Please approve in wallet app.`);
    }
    
    console.log(`[Albedo] Timeout set to ${ALBEDO_TIMEOUT_MS}ms for ${action}`);
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          let errorMsg = `Albedo ${action} timed out.`;
          
          if (isMobileBrowser()) {
            if (retryCount === 0) {
              errorMsg += " Check that Albedo popup opened. If not, try again.";
            } else {
              errorMsg += " The request may still be pending. Check your wallet app.";
            }
          }
          
          const err = new Error(errorMsg);
          (err as any).isTimeout = true;
          console.error("[Albedo]", errorMsg);
          reject(err);
        }, ALBEDO_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const albedoProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    // Albedo is a web popup, always available
    return true;
  },

  async connect(): Promise<string> {
    try {
      console.log("[Albedo] Initiating connection...");
      const result = await withAlbedoTimeout(
        albedo.publicKey({}),
        "connection",
        0
      );
      console.log("[Albedo] Connection successful, pubkey:", result.pubkey?.substring(0, 8) + "...");
      if (!result.pubkey) {
        throw new Error("Albedo did not return a public key.");
      }
      return result.pubkey;
    } catch (error: any) {
      console.error("[Albedo] Connection error:", error?.message || error);
      if (error.isTimeout && isMobileBrowser()) {
        throw new Error(
          "Albedo connection timed out. Make sure you have pop-ups enabled and try again."
        );
      }
      throw error;
    }
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string,
    retryCount: number = 0
  ): Promise<string> {
    try {
      console.log("[Albedo] Starting signature request...");
      console.log("[Albedo] Network:", networkPassphrase.includes("Test") ? "testnet" : "public");
      console.log("[Albedo] XDR length:", xdr.length);
      
      const result = await withAlbedoTimeout(
        albedo.tx({
          xdr,
          network: networkPassphrase.includes("Test") ? "testnet" : "public",
        }),
        "signature request",
        retryCount
      );
      
      console.log("[Albedo] Signature successful");
      if (!result.signed_envelope_xdr) {
        throw new Error("Albedo did not return a signed transaction.");
      }
      return result.signed_envelope_xdr;
    } catch (error: any) {
      console.error("[Albedo] Signature error:", error?.message || error);
      if (error.isTimeout && isMobileBrowser() && retryCount === 0) {
        // Suggest retry once
        throw new Error(
          "Albedo signature took too long. Please check your wallet app and try submitting again."
        );
      }
      throw error;
    }
  },
};
