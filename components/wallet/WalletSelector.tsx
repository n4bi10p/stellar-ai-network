"use client";

import { useState, useEffect } from "react";
import { Wallet, X, Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/hooks/useWallet";

export function WalletSelector({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connect, loading, detectWallets } = useWallet();
  const [providers, setProviders] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const supported = await detectWallets();
        if (!cancelled) {
          // Sort available wallets first
          const sorted = [...supported].sort((a, b) => {
            if (a.isAvailable === b.isAvailable) return 0;
            return a.isAvailable ? -1 : 1;
          });
          setProviders(sorted);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, detectWallets]);

  if (!open) return null;

  async function handleSelect(id: string) {
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
        <div className="space-y-2 px-5 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {checking && providers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting wallets...
            </div>
          ) : (
            providers.map((provider) => {
              const available = provider.isAvailable;
              const isConnecting = connectingId === provider.id;
              // If not available, we can click download
              const disabled = loading || (!available && provider.id !== 'wallet-connect');

              return (
                <button
                  key={provider.id}
                  onClick={() => handleSelect(provider.id)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
                    available || provider.id === 'wallet-connect'
                      ? "border-border/40 bg-surface-2/50 hover:border-accent/50 hover:bg-surface-2"
                      : "cursor-not-allowed border-border/20 opacity-40"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex shrink-0 h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white">
                    <img src={provider.icon} alt={provider.name} className="h-full w-full object-contain" />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tracking-wide">
                        {provider.name}
                      </span>
                      {available || provider.id === 'wallet-connect' ? (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] tracking-wider text-accent">
                          {provider.id === 'wallet-connect' ? "READY" : "DETECTED"}
                        </span>
                      ) : (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] tracking-wider text-red-400">
                          NOT FOUND
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : !available && provider.url ? (
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-accent underline"
                      title="Install Wallet"
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
          {">"} Select a wallet provider to connect to Stellar Testnet
        </div>
      </div>
    </div>
  );
}
