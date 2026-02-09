"use client";

import { create } from "zustand";
import {
  isConnected as freighterIsConnected,
  getAddress,
  requestAccess,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";
import { fetchBalance as fetchXLMBalance } from "@/lib/stellar/client";
import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";
import type { WalletState } from "@/lib/stellar/types";

interface WalletStore extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;
}

export const useWallet = create<WalletStore>((set, get) => ({
  connected: false,
  address: "",
  balance: "0",
  loading: false,
  error: "",

  connect: async () => {
    set({ loading: true, error: "" });
    try {
      // Check if Freighter is installed
      const { isConnected } = await freighterIsConnected();
      if (!isConnected) {
        throw new Error(
          "Freighter wallet not found. Please install the Freighter browser extension."
        );
      }

      // Request access (prompts user)
      const { address, error: addrErr } = await requestAccess();
      if (addrErr) throw new Error(addrErr.message);

      // Verify network
      const { network, error: netErr } = await getNetwork();
      if (netErr) throw new Error(netErr.message);

      // Fetch balance
      let balance = "0";
      try {
        balance = await fetchXLMBalance(address);
      } catch {
        // Account may not exist yet on testnet
        balance = "0";
      }

      set({
        connected: true,
        address,
        balance,
        loading: false,
        error: "",
      });

      console.log(
        `[WALLET] Connected: ${address.slice(0, 8)}... on ${network}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      set({ loading: false, error: msg });
      console.error("[WALLET] Connection error:", msg);
    }
  },

  disconnect: () => {
    set({
      connected: false,
      address: "",
      balance: "0",
      loading: false,
      error: "",
    });
    console.log("[WALLET] Disconnected");
  },

  refreshBalance: async () => {
    const { address, connected } = get();
    if (!connected || !address) return;

    try {
      const balance = await fetchXLMBalance(address);
      set({ balance });
    } catch {
      // silently fail — account may not be funded
    }
  },

  signTx: async (xdr: string) => {
    const { address } = get();
    const { signedTxXdr, error } = await signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address,
    });
    if (error) throw new Error(error.message);
    return signedTxXdr;
  },
}));
