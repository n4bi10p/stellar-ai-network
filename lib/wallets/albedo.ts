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
};

export const albedoProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    // Albedo is a web popup, always available
    return true;
  },

  async connect(): Promise<string> {
    const result = await albedo.publicKey({});
    if (!result.pubkey) {
      throw new Error("Albedo did not return a public key.");
    }
    return result.pubkey;
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string
  ): Promise<string> {
    const result = await albedo.tx({
      xdr,
      network: networkPassphrase.includes("Test") ? "testnet" : "public",
    });
    if (!result.signed_envelope_xdr) {
      throw new Error("Albedo did not return a signed transaction.");
    }
    return result.signed_envelope_xdr;
  },
};
