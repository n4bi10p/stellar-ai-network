"use client";

import { create } from "zustand";
import { fetchBalance as fetchXLMBalance } from "@/lib/stellar/client";
import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";
import type { WalletState } from "@/lib/stellar/types";
import type { WalletId, WalletProvider } from "@/lib/wallets/types";
import { getProvider, WALLET_PROVIDERS } from "@/lib/wallets";

function getWalletErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const keys = Object.keys(err);
    if (keys.length === 0) {
      return "Wallet connection did not complete. Reopen the wallet app and try again.";
    }

    const message = Reflect.get(err, "message");
    if (typeof message === "string" && message) return message;

    const nested = Reflect.get(err, "error");
    if (nested && typeof nested === "object") {
      const nestedMessage = Reflect.get(nested, "message");
      if (typeof nestedMessage === "string" && nestedMessage) return nestedMessage;
    }

    const reason = Reflect.get(err, "reason");
    if (typeof reason === "string" && reason) return reason;

    const name = Reflect.get(err, "name");
    if (typeof name === "string" && name) return `${name}: wallet request failed`;
  }
  return "Connection failed";
}

interface WalletStore extends WalletState {
  /** Currently active wallet provider id */
  activeWallet: WalletId | null;
  /** The live provider instance (not serialisable, excluded from devtools) */
  _provider: WalletProvider | null;

  /** Connect using a specific wallet provider */
  connect: (walletId?: WalletId) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;

  /** Check which wallets are currently available in the browser */
  detectWallets: () => Promise<WalletId[]>;
}

export const useWallet = create<WalletStore>((set, get) => ({
  connected: false,
  address: "",
  balance: "0",
  loading: false,
  error: "",
  activeWallet: null,
  _provider: null,

  detectWallets: async () => {
    const available: WalletId[] = [];
    for (const p of WALLET_PROVIDERS) {
      try {
        if (await p.isAvailable()) available.push(p.meta.id);
      } catch {
        // skip unavailable
      }
    }
    return available;
  },

  connect: async (walletId?: WalletId) => {
    set({ loading: true, error: "" });
    try {
      // Default to freighter for backward compatibility
      const id = walletId ?? "freighter";
      const provider = getProvider(id);
      if (!provider) throw new Error(`Unknown wallet: ${id}`);

      // Check availability (skip for Albedo — always available)
      if (id !== "albedo") {
        const available = await provider.isAvailable();
        if (!available) {
          throw new Error(
            `${provider.meta.name} wallet not found. Install it from ${provider.meta.installUrl}`
          );
        }
      }

      // Connect and get public key
      const address = await provider.connect();

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
        activeWallet: id,
        _provider: provider,
      });

      console.log(
        `[WALLET] Connected via ${provider.meta.name}: ${address.slice(0, 8)}...`
      );

      // Track wallet connection event
      try {
        await fetch("/api/internal/track-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });
      } catch (trackErr) {
        console.warn("[WALLET] Failed to track wallet connection:", trackErr);
        // Don't fail wallet connection if tracking fails
      }
    } catch (err) {
      const msg = getWalletErrorMessage(err);
      set({ loading: false, error: msg });
      console.error("[WALLET] Connection error:", err);
    }
  },

  disconnect: () => {
    const provider = get()._provider;
    if (provider?.disconnect) {
      void provider.disconnect().catch((err) => {
        console.error("[WALLET] Disconnect error:", err);
      });
    }
    set({
      connected: false,
      address: "",
      balance: "0",
      loading: false,
      error: "",
      activeWallet: null,
      _provider: null,
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
    const { _provider } = get();
    if (!_provider) throw new Error("No wallet connected");
    return _provider.signTransaction(xdr, NETWORK_PASSPHRASE);
  },
}));
