"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";

const strategies = [
  {
    id: "auto_rebalance",
    name: "Auto-Rebalancer",
    desc: "Maintains asset ratio automatically",
  },
  {
    id: "recurring_payment",
    name: "Bill Scheduler",
    desc: "Recurring payments on schedule",
  },
  {
    id: "price_alert",
    name: "Price Alert",
    desc: "Execute when price threshold met",
  },
];

export default function CreateAgentPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !strategy) return;

    setCreating(true);
    // Level 2 will deploy a real Soroban contract here
    await new Promise((r) => setTimeout(r, 1500));
    setCreating(false);

    // Navigate back to dashboard
    router.push("/dashboard");
  }

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="text-xs font-semibold tracking-widest">
                AGENTS // CREATE_NEW
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Configure and deploy a new AI agent
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {!connected ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
              <div className="text-sm text-muted">
                &gt; Connect your wallet to create agents
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="max-w-xl space-y-6">
              {/* Agent Name */}
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted">
                  AGENT_NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. REBALANCER_01"
                  className="w-full border border-border/40 bg-surface/80 px-4 py-2.5 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50"
                />
              </div>

              {/* Strategy Selection */}
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted">
                  STRATEGY_TYPE
                </label>
                <div className="space-y-2">
                  {strategies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategy(s.id)}
                      className={`flex w-full items-center justify-between border px-4 py-3 text-left transition-colors ${
                        strategy === s.id
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border/40 bg-surface/80 text-muted hover:bg-surface-2/80"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold tracking-wider">
                          {s.name}
                        </div>
                        <div className="mt-0.5 text-[10px] tracking-wider opacity-70">
                          {s.desc}
                        </div>
                      </div>
                      {strategy === s.id && (
                        <span className="text-[10px] font-bold tracking-widest">
                          SELECTED
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || !strategy || creating}
                className="w-full border border-accent/50 bg-accent/10 py-2.5 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
              >
                {creating ? "> DEPLOYING..." : "> DEPLOY_AGENT"}
              </button>

              <div className="text-[10px] tracking-wider text-muted">
                &gt; Agent will be deployed as a Soroban smart contract (Level 2)
                <br />
                &gt; Currently using local mock for preview
              </div>
            </form>
          )}
        </div>
      </main>

      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            DEPLOY_INFO
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Network: TESTNET</div>
          <div>&gt; Contract: Soroban</div>
          <div>&gt; Gas estimate: ~100 stroops</div>
          <div>&gt; Deployment time: ~5s</div>
        </div>
      </aside>
    </HudShell>
  );
}
