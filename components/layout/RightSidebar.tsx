"use client";

import { useWallet } from "@/lib/hooks/useWallet";
import { formatXLM, truncateAddress } from "@/lib/utils/formatting";
import { txExplorerUrl } from "@/lib/utils/constants";
import type { ChatMessage, TransactionResult } from "@/lib/stellar/types";

/* ── Right Sidebar ── */
export function RightSidebar({
  messages,
  lastTx,
}: {
  messages: ChatMessage[];
  lastTx: TransactionResult | null;
}) {
  const { connected, address, balance, activeWallet } = useWallet();

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border/60 bg-surface">
      {/* System Status */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="text-xs font-semibold tracking-widest">
          SYSTEM_STATUS
        </div>
      </div>

      {/* Wallet Module */}
      <div className="border-b border-border/40 px-4 py-4">
        <div className="flex items-center justify-between text-[10px] tracking-wider text-muted">
          <span>{"// WALLET_MODULE"}</span>
          <span
            className={`rounded px-1.5 py-0.5 ${
              connected
                ? "bg-accent/20 text-accent"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {connected ? "SYNCED" : "OFFLINE"}
          </span>
        </div>

        {connected ? (
          <>
            <div className="mt-2 flex items-center justify-between text-[10px] tracking-wider text-muted">
              <span>PROVIDER</span>
              <span className="text-accent">{activeWallet?.toUpperCase()}</span>
            </div>
            <div className="mt-1 text-[10px] tracking-wider text-muted">
              ADDR: {truncateAddress(address, 6)}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {formatXLM(balance)} <span className="text-sm text-muted">XLM</span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between border border-border/40 px-3 py-1.5 text-xs">
                <span className="text-muted">XLM_BAL</span>
                <span>{formatXLM(balance)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-muted">
            &gt; Connect wallet to view balances
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-border/40 px-3 py-2">
            <div className="text-[10px] tracking-wider text-muted">
              MESSAGES
            </div>
            <div className="mt-1 text-sm font-semibold">{messages.length}</div>
          </div>
          <div className="border border-border/40 px-3 py-2">
            <div className="text-[10px] tracking-wider text-muted">
              TX_COUNT
            </div>
            <div className="mt-1 text-sm font-semibold">
              {messages.filter((m) => m.txResult).length}
            </div>
          </div>
        </div>
        <div className="mt-2 border border-border/40 px-3 py-2">
          <div className="text-[10px] tracking-wider text-muted">NETWORK</div>
          <div className="mt-1 text-sm font-semibold">TESTNET</div>
        </div>
      </div>

      {/* Last Transaction */}
      {lastTx && (
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-[10px] tracking-widest font-semibold">
            LAST_TRANSACTION
          </div>
          <div className="mt-2 space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">STATUS</span>
              <span className={lastTx.success ? "text-accent" : "text-red-400"}>
                {lastTx.success ? "SUCCESS" : "FAILED"}
              </span>
            </div>
            {lastTx.hash && (
              <div className="flex items-center justify-between">
                <span className="text-muted">HASH</span>
                <a
                  href={txExplorerUrl(lastTx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {lastTx.hash.slice(0, 8)}...
                </a>
              </div>
            )}
            {lastTx.ledger && (
              <div className="flex items-center justify-between">
                <span className="text-muted">LEDGER</span>
                <span>{lastTx.ledger}</span>
              </div>
            )}
            {lastTx.error && (
              <div className="mt-1 text-red-400">&gt; {lastTx.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Recent Log */}
      <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
        <div className="mb-1 font-semibold tracking-widest text-foreground/60">
          ACTIVITY_LOG
        </div>
        {messages.length === 0 ? (
          <div>&gt; Waiting for commands...</div>
        ) : (
          messages
            .slice(-6)
            .map((m) => (
              <div key={m.id}>
                &gt; [{m.timestamp}] {m.role.toUpperCase()}: {m.content.slice(0, 50)}
                {m.content.length > 50 ? "..." : ""}
              </div>
            ))
        )}
      </div>
    </aside>
  );
}
