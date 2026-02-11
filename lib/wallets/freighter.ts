// ── Freighter Wallet Adapter ──

import {
  isConnected as freighterIsConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import type { WalletProvider, WalletMeta } from "./types";

const meta: WalletMeta = {
  id: "freighter",
  name: "Freighter",
  description: "Stellar's most popular browser wallet",
  installUrl: "https://www.freighter.app/",
  icon: "🚀",
};

export const freighterProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    try {
      const { isConnected } = await freighterIsConnected();
      return isConnected;
    } catch {
      return false;
    }
  },

  async connect(): Promise<string> {
    const { isConnected } = await freighterIsConnected();
    if (!isConnected) {
      throw new Error(
        "Freighter wallet not found. Please install the Freighter browser extension."
      );
    }

    const { address, error } = await requestAccess();
    if (error) throw new Error(error.message ?? "Freighter connection failed");
    return address;
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string
  ): Promise<string> {
    const { signedTxXdr, error } = await signTransaction(xdr, {
      networkPassphrase,
    });
    if (error) throw new Error(error.message ?? "Freighter signing failed");
    return signedTxXdr;
  },
};
