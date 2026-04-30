"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchBalance as fetchXLMBalance } from "@/lib/stellar/client";
import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";
import type { WalletState } from "@/lib/stellar/types";

let kitInstance: any = null;

async function getKit() {
  if (typeof window === "undefined") return null;
  if (!kitInstance) {
    // Dynamically import to prevent Next.js SSR crashes
    // because the kit uses localStorage at the root module level
    const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit/sdk");
    const { defaultModules } = await import("@creit.tech/stellar-wallets-kit/modules/utils");
    const { Networks } = await import("@creit.tech/stellar-wallets-kit/types");

    StellarWalletsKit.init({
      modules: defaultModules(),
    });
    // Try to map our passphrase to their Networks enum
    if (NETWORK_PASSPHRASE.includes("Test")) {
      StellarWalletsKit.setNetwork(Networks.TESTNET);
    } else {
      StellarWalletsKit.setNetwork(Networks.PUBLIC);
    }
    kitInstance = StellarWalletsKit;
  }
  return kitInstance;
}

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
  activeWallet: string | null;
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;
  detectWallets: () => Promise<any[]>;
  openAuthModal: () => Promise<void>;
}

export const useWallet = create<WalletStore>()(
  persist(
    (set, get) => ({
      connected: false,
      address: "",
      balance: "0",
      loading: false,
      error: "",
      activeWallet: null,

      detectWallets: async () => {
        const kit = await getKit();
        if (!kit) return [];
        return kit.refreshSupportedWallets();
      },

      connect: async (walletId?: string) => {
        set({ loading: true, error: "" });
        try {
          const kit = await getKit();
          if (!kit) throw new Error("Wallet kit not initialized");

          if (walletId) {
            kit.setWallet(walletId);
          }

          const { address } = await kit.fetchAddress();

          let balance = "0";
          try {
            balance = await fetchXLMBalance(address);
          } catch {
            balance = "0";
          }

          set({
            connected: true,
            address,
            balance,
            loading: false,
            error: "",
            activeWallet: walletId || kit.selectedModule?.productId || null,
          });

          console.log(`[WALLET] Connected: ${address.slice(0, 8)}...`);

          try {
            await fetch("/api/internal/track-wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: address }),
            });
          } catch (trackErr) {
            console.warn("[WALLET] Failed to track wallet connection:", trackErr);
          }
        } catch (err) {
          const msg = getWalletErrorMessage(err);
          set({ loading: false, error: msg });
          console.error("[WALLET] Connection error:", err);
        }
      },

      openAuthModal: async () => {
        set({ loading: true, error: "" });
        try {
          const kit = await getKit();
          if (!kit) throw new Error("Wallet kit not initialized");

          const { address } = await kit.authModal();

          let balance = "0";
          try {
            balance = await fetchXLMBalance(address);
          } catch {
            balance = "0";
          }

          set({
            connected: true,
            address,
            balance,
            loading: false,
            error: "",
            activeWallet: kit.selectedModule?.productId || null,
          });

          console.log(`[WALLET] Connected via modal: ${address.slice(0, 8)}...`);

          try {
            await fetch("/api/internal/track-wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: address }),
            });
          } catch (trackErr) {
            console.warn("[WALLET] Failed to track wallet connection:", trackErr);
          }
        } catch (err) {
          const msg = getWalletErrorMessage(err);
          set({ loading: false, error: msg });
          console.error("[WALLET] Modal auth error:", err);
        }
      },

      disconnect: async () => {
        const kit = await getKit();
        if (kit) {
          kit.disconnect().catch((err: any) => console.error("[WALLET] Disconnect error:", err));
        }
        set({
          connected: false,
          address: "",
          balance: "0",
          loading: false,
          error: "",
          activeWallet: null,
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
          // silently fail
        }
      },

      signTx: async (xdr: string) => {
        const kit = await getKit();
        if (!kit) throw new Error("No wallet connected");
        
        const { address } = get();
        if (!address) throw new Error("Not connected");

        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        });
        return signedTxXdr;
      },
    }),
    {
      name: "wallet-storage",
      partialize: (state) => ({
        connected: state.connected,
        address: state.address,
        activeWallet: state.activeWallet,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.connected && state.address && state.activeWallet) {
          console.log(`[WALLET] Rehydrating from storage: ${state.address.slice(0, 8)}...`);
          // Note: using timeout to wait for kit initialization on mount if needed
          setTimeout(() => {
            state.connect?.(state.activeWallet || undefined).catch((err: any) => {
              console.warn("[WALLET] Auto-reconnect failed:", err);
            });
          }, 500);
        }
      },
    }
  )
);
