// ── Albedo Wallet Adapter ──
// Albedo is a web-based Stellar wallet that communicates via popups.
// SDK: @albedo-link/intent

import albedo from "@albedo-link/intent";
import type { WalletProvider, WalletMeta } from "./types";

const meta: WalletMeta = {
  id: "albedo",
  name: "Albedo",
  description: "Web-based Stellar signer — no extension needed",
  installUrl: "https://albedo.link/",
  icon: "🌐",
  platforms: ["desktop", "mobile"],
  connectionMethod: "popup",
};

const ALBEDO_TIMEOUT_MS = 15_000;

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function withAlbedoTimeout<T>(promise: Promise<T>, action: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const suffix = isMobileBrowser()
            ? " Albedo uses a popup flow on mobile, so open the app in Safari and allow popups."
            : "";
          reject(new Error(`Albedo ${action} timed out.${suffix}`));
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
    const result = await withAlbedoTimeout(
      albedo.publicKey({}),
      "connection"
    );
    if (!result.pubkey) {
      throw new Error("Albedo did not return a public key.");
    }
    return result.pubkey;
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string
  ): Promise<string> {
    const result = await withAlbedoTimeout(
      albedo.tx({
        xdr,
        network: networkPassphrase.includes("Test") ? "testnet" : "public",
      }),
      "signature request"
    );
    if (!result.signed_envelope_xdr) {
      throw new Error("Albedo did not return a signed transaction.");
    }
    return result.signed_envelope_xdr;
  },
};
