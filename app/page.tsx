"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, ArrowUp, Wallet, LogOut, ExternalLink } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { useWallet } from "@/lib/hooks/useWallet";
import { useAI } from "@/lib/hooks/useAI";
import { useStellar } from "@/lib/hooks/useStellar";
import { timestamp } from "@/lib/utils/formatting";
import { truncateAddress, formatXLM } from "@/lib/utils/formatting";
import { txExplorerUrl } from "@/lib/utils/constants";
import type { ChatMessage, TransactionResult } from "@/lib/stellar/types";

/* ── Help text ── */
const HELP_MESSAGE = `> ═══════════════════════════════════════
> STELLAR_AI AGENT — COMMAND REFERENCE
> ═══════════════════════════════════════
>
> WALLET COMMANDS:
>   connect wallet    — Connect Freighter wallet
>   check my balance  — Show current XLM balance
>   status            — Show system & wallet status
>
> TRANSACTION COMMANDS:
>   Send 10 XLM to GXXX...
>   Transfer 5.5 XLM to GABC...
>   Pay 100 XLM to GDEF...
>
> AI-POWERED (natural language):
>   "What's my balance?"
>   "Send fifty lumens to GXXX..."
>   "Transfer all to GABC..."
>
> UTILITY COMMANDS:
>   help / ?   — Show this help message
>   clear      — Clear chat history
>   status     — Show system status
>
> COMING SOON (Level 2+):
>   create agent      — Deploy AI agent contract
>   list agents       — View deployed agents
>   agent templates   — Browse preset strategies
>
> ═══════════════════════════════════════`;

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastTx, setLastTx] = useState<TransactionResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { connected, address, balance, loading: walletLoading, error: walletError, connect, disconnect, refreshBalance } = useWallet();
  const { parseCommand, loading: aiLoading } = useAI();
  const { sendXLM, loading: txLoading } = useStellar();

  const isProcessing = aiLoading || txLoading;

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function addMessage(
    role: ChatMessage["role"],
    content: string,
    extra?: Partial<ChatMessage>
  ) {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: timestamp(),
      ...extra,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    // Add user message
    addMessage("user", trimmed);
    setInput("");

    // Must be connected for most commands
    if (!connected) {
      // Allow help even without wallet
      if (trimmed.toLowerCase() === "help" || trimmed.toLowerCase() === "?") {
        addMessage("agent", HELP_MESSAGE);
        return;
      }
      addMessage("system", "Wallet not connected. Click CONNECT_WALLET or type 'connect wallet'.");
      return;
    }

    // Handle meta commands
    if (trimmed.toLowerCase() === "help" || trimmed.toLowerCase() === "?") {
      addMessage("agent", HELP_MESSAGE);
      return;
    }

    if (trimmed.toLowerCase() === "clear") {
      setMessages([]);
      return;
    }

    if (trimmed.toLowerCase() === "status") {
      addMessage("agent", `> SYSTEM STATUS\n  WALLET: ${connected ? "CONNECTED" : "DISCONNECTED"}\n  ADDR: ${truncateAddress(address, 8)}\n  BALANCE: ${formatXLM(balance)} XLM\n  NETWORK: TESTNET\n  AI_ENGINE: Gemini 2.0 Flash Lite\n  MODE: INTERACTIVE`);
      return;
    }
    if (trimmed.toLowerCase().includes("connect wallet")) {
      await connect();
      addMessage("system", connected ? "Wallet already connected." : "Attempting wallet connection...");
      return;
    }

    // Parse with AI
    addMessage("agent", "> Parsing command...");

    try {
      const parsed = await parseCommand(trimmed);

      if (parsed.action === "check_balance") {
        await refreshBalance();
        addMessage("agent", `> Current balance: ${formatXLM(balance)} XLM\n> Address: ${truncateAddress(address, 8)}`);
        return;
      }

      if (parsed.action === "send_xlm") {
        if (!parsed.destination || !parsed.amount) {
          addMessage("agent", "> Could not extract destination or amount from your command. Try: 'Send 10 XLM to GXXX...'");
          return;
        }

        addMessage("agent", `> Preparing transaction:\n  TO: ${truncateAddress(parsed.destination, 8)}\n  AMOUNT: ${parsed.amount} XLM\n> Waiting for Freighter signature...`);

        const result = await sendXLM(parsed.destination, parsed.amount);
        setLastTx(result);

        if (result.success) {
          addMessage("agent", `> Transaction successful!\n  [SUCCESS] TX_HASH: ${result.hash?.slice(0, 16)}...\n  LEDGER: ${result.ledger}`, {
            txResult: result,
          });
        } else {
          addMessage("agent", `> Transaction failed.\n  [ERROR] ${result.error}`, {
            txResult: result,
          });
        }
        return;
      }

      if (parsed.action === "create_agent") {
        addMessage("agent", "> Agent creation will be available in Level 2. Stay tuned!");
        return;
      }

      addMessage("agent", `> Command parsed: ${JSON.stringify(parsed)}\n> No handler for this action yet.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addMessage("agent", `> [ERROR] ${msg}`);
    }
  }

  return (
    <HudShell>
      {/* ─── Center Content ─── */}
      <main className="hud-grid flex min-w-0 flex-1 flex-col">
        {/* Terminal prompt bar */}
        <div className="flex items-center justify-between border-b border-border/40 bg-surface/50 px-4 py-2 text-xs">
          <span className="text-muted">
            root@stellar-os:~/agents/alpha-01 ${" "}
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-foreground" />
          </span>
          <div className="flex items-center gap-2">
            {connected ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-[10px] text-accent transition-colors hover:bg-surface-2"
              >
                <LogOut className="h-3 w-3" />
                DISCONNECT
              </button>
            ) : (
              <button
                onClick={connect}
                disabled={walletLoading}
                className="flex items-center gap-1 rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              >
                <Wallet className="h-3 w-3" />
                {walletLoading ? "CONNECTING..." : "CONNECT_WALLET"}
              </button>
            )}
            <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted">
              PID: 8492
            </span>
            <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted">
              SECURE
            </span>
          </div>
        </div>

        {/* Chat / Agent Conversation */}
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div>
              <div className="text-[10px] tracking-wider text-accent">
                system <span className="text-muted">@ boot</span>
              </div>
              <div className="mt-2 border border-border/40 bg-surface/80 px-4 py-3 text-sm leading-relaxed">
                &gt; Welcome to <strong>Stellar AI Agent Network</strong>.
                <br />
                &gt; {connected
                  ? `Wallet connected: ${truncateAddress(address, 8)} | Balance: ${formatXLM(balance)} XLM`
                  : "Connect your Freighter wallet to get started."}
                <br />
                &gt; Try commands like:
                <br />
                &nbsp;&nbsp;&bull; &quot;Check my balance&quot;
                <br />
                &nbsp;&nbsp;&bull; &quot;Send 10 XLM to GXXX...&quot;
                <br />
                &gt; Type below to begin.
              </div>
            </div>
          )}

          {/* Wallet error */}
          {walletError && (
            <div>
              <div className="text-[10px] tracking-wider text-red-400">
                system <span className="text-muted">@ {timestamp()}</span>
              </div>
              <div className="mt-2 border border-red-500/30 bg-surface/80 px-4 py-2 text-sm text-red-400">
                &gt; [ERROR] {walletError}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user" ? "flex flex-col items-end" : ""
              }
            >
              <div
                className={`text-[10px] tracking-wider ${
                  msg.role === "agent"
                    ? "text-accent"
                    : msg.role === "system"
                    ? "text-yellow-500"
                    : "text-muted"
                }`}
              >
                {msg.role === "user" ? "admin_user" : msg.role === "agent" ? "agent_alpha" : "system"}{" "}
                <span className="text-muted">@ {msg.timestamp}</span>
              </div>
              <div
                className={`mt-2 border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "max-w-lg border-border/40 bg-surface-2/80"
                    : msg.txResult && !msg.txResult.success
                    ? "border-red-500/30 bg-surface/80"
                    : "border-border/40 bg-surface/80"
                }`}
              >
                {msg.content}
              </div>
              {/* TX hash link */}
              {msg.txResult?.hash && (
                <a
                  href={txExplorerUrl(msg.txResult.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-[10px] text-accent underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Stellar Explorer
                </a>
              )}
            </div>
          ))}

          {/* Processing indicator */}
          {isProcessing && (
            <div>
              <div className="text-[10px] tracking-wider text-accent">
                agent_alpha <span className="text-muted">@ {timestamp()}</span>
              </div>
              <div className="mt-2 border border-border/40 bg-surface/80 px-4 py-3 text-sm">
                &gt; Processing
                <span className="inline-block animate-pulse">...</span>
              </div>
            </div>
          )}
        </div>

        {/* Command Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border/40 bg-surface/50 px-5 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-accent">&gt;</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                connected
                  ? "Enter command or message..."
                  : "Connect wallet first..."
              }
              disabled={isProcessing}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60 disabled:opacity-50"
            />
            <button
              type="button"
              className="p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="rounded border border-border/60 bg-surface-2 p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] tracking-wider text-muted">
            <span>
              STATUS:{" "}
              <span
                className={
                  isProcessing ? "text-yellow-500" : "text-accent"
                }
              >
                {isProcessing ? "PROCESSING" : "LISTENING"}
              </span>
            </span>
            <span>MODE: INTERACTIVE</span>
          </div>
        </form>
      </main>

      {/* ─── Right Sidebar ─── */}
      <RightSidebar messages={messages} lastTx={lastTx} />
    </HudShell>
  );
}
