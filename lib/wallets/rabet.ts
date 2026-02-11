// ── Rabet Wallet Adapter ──
// Rabet is a browser-extension wallet for Stellar.
// It injects `window.rabet` into the page.

import type { WalletProvider, WalletMeta } from "./types";

/** Rabet's injected global API shape */
interface RabetAPI {
  connect: () => Promise<{ publicKey: string }>;
  sign: (
    xdr: string,
    network: "testnet" | "mainnet"
  ) => Promise<{ xdr: string }>;
}

declare global {
  interface Window {
    rabet?: RabetAPI;
  }
}

const meta: WalletMeta = {
  id: "rabet",
  name: "Rabet",
  description: "Fast Stellar browser extension wallet",
  installUrl: "https://rabet.io/",
  icon: "🦊",
};

export const rabetProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return !!window.rabet;
  },

  async connect(): Promise<string> {
    if (!window.rabet) {
      throw new Error(
        "Rabet wallet not found. Please install the Rabet browser extension."
      );
    }
    const { publicKey } = await window.rabet.connect();
    if (!publicKey) {
      throw new Error("Rabet did not return a public key.");
    }
    return publicKey;
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string
  ): Promise<string> {
    if (!window.rabet) {
      throw new Error("Rabet wallet not available.");
    }
    const network = networkPassphrase.includes("Test") ? "testnet" : "mainnet";
    const result = await window.rabet.sign(xdr, network);
    if (!result.xdr) {
      throw new Error("Rabet did not return a signed transaction.");
    }
    return result.xdr;
  },
};
