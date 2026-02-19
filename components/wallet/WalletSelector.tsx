"use client";

import { useState, useEffect } from "react";
import { Wallet, X, Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/hooks/useWallet";
import { WALLET_PROVIDERS } from "@/lib/wallets";
import type { WalletId } from "@/lib/wallets/types";

/**
 * HUD-styled wallet selector modal.
 * Shows available wallets & lets the user pick one to connect.
 */
export function WalletSelector({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connect, loading } = useWallet();
  const [detected, setDetected] = useState<WalletId[] | null>(null);
  const checking = open && detected === null;
  const [connectingId, setConnectingId] = useState<WalletId | null>(null);

  // Detect which wallets are installed
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setDetected(null);
      const ids = await useWallet.getState().detectWallets();
      if (!cancelled) setDetected(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  async function handleSelect(id: WalletId) {
    setConnectingId(id);
    await connect(id);
    const state = useWallet.getState();
    if (state.connected) onClose();
    setConnectingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-border/60 bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest">
            <Wallet className="h-4 w-4 text-accent" />
            SELECT_WALLET
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-2 px-5 py-4">
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting wallets...
            </div>
          ) : (
            WALLET_PROVIDERS.map((provider) => {
              const available =
                (detected ?? []).includes(provider.meta.id) ||
                provider.meta.id === "albedo"; // Albedo is always available
              const isConnecting = connectingId === provider.meta.id;

              return (
                <button
                  key={provider.meta.id}
                  onClick={() => handleSelect(provider.meta.id)}
                  disabled={loading || (!available && provider.meta.id !== "albedo")}
                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
                    available
                      ? "border-border/40 bg-surface-2/50 hover:border-accent/50 hover:bg-surface-2"
                      : "cursor-not-allowed border-border/20 opacity-40"
                  }`}
                >
                  {/* Icon */}
                  <span className="text-xl">{provider.meta.icon}</span>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tracking-wide">
                        {provider.meta.name}
                      </span>
                      {available ? (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] tracking-wider text-accent">
                          DETECTED
                        </span>
                      ) : (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] tracking-wider text-red-400">
                          NOT FOUND
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted">
                      {provider.meta.description}
                    </div>
                  </div>

                  {/* Action */}
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : !available ? (
                    <a
                      href={provider.meta.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-accent underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border/40 px-5 py-2.5 text-[10px] tracking-wider text-muted">
          &gt; Select a wallet provider to connect to Stellar Testnet
        </div>
      </div>
    </div>
  );
}
