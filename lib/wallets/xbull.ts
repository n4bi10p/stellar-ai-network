// ── XBull Wallet Provider ──
// Mobile-friendly Stellar XBull Wallet integration

import type { WalletProvider, WalletMeta } from "./types";

const meta: WalletMeta = {
  id: "xbull",
  name: "XBull Wallet",
  description: "XBull Browser Extension or Web Wallet (Desktop)",
  installUrl: "https://xbull.app",
  icon: "🔐",
  platforms: ["desktop"],
  connectionMethod: "extension",
  badgeLabel: "EXTENSION-ONLY",
};

/** Check if XBull is available */
async function isXBullAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // XBull injects as window.xBull
  return Boolean((window as any).xBull);
}

/** Sign a transaction with XBull */
async function signWithXBull(xdr: string, networkPassphrase: string): Promise<string> {
  const xbull = (window as any).xBull;
  if (!xbull) {
    throw new Error("XBull Wallet not found. Install it first.");
  }

  try {
    const result = await xbull.signTransaction(xdr, {
      networkPassphrase,
    });
    return result.signedXDR;
  } catch (error: any) {
    console.error("XBull signature error:", error);
    throw new Error(`XBull signature failed: ${error.message}`);
  }
}

export const xbullProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    return isXBullAvailable();
  },

  async connect(): Promise<string> {
    try {
      const available = await isXBullAvailable();
      if (!available) {
        throw new Error(
          "XBull Wallet not installed. Install it from https://xbull.app"
        );
      }

      const xbull = (window as any).xBull;
      // XBull auto-connects on usage, just request public key
      const response = await xbull.getPublicKey();
      return response;
    } catch (error: any) {
      throw new Error(`Failed to connect XBull: ${error.message}`);
    }
  },

  async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
    try {
      return await signWithXBull(xdr, networkPassphrase);
    } catch (error: any) {
      throw new Error(`XBull: ${error.message}`);
    }
  },

  async disconnect(): Promise<void> {
    // XBull doesn't have explicit disconnect
    // But they persist state, so no action needed
  },
};
