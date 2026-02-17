"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { AGENT_TEMPLATES, getTemplate } from "@/lib/agents/templates";
import { txExplorerUrl } from "@/lib/utils/constants";
import { getErrorMessage } from "@/lib/utils/errors";

type TxStatus = "idle" | "building" | "signing" | "submitting" | "success" | "failed";

export default function CreateAgentPage() {
  return (
    <Suspense fallback={
      <HudShell>
        <main className="hud-grid flex min-w-0 flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </main>
      </HudShell>
    }>
      <CreateAgentInner />
    </Suspense>
  );
}

function CreateAgentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connected, address, signTx } = useWallet();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [strategyConfig, setStrategyConfig] = useState<Record<string, unknown>>({});
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [contractId, setContractId] = useState<string>("");
  const [agentStoreId, setAgentStoreId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Pre-fill from template query param
  useEffect(() => {
    const tplId = searchParams.get("template");
    if (tplId) {
      const tpl = getTemplate(tplId);
      if (tpl) {
        setTemplateId(tpl.id);
        setStrategy(tpl.strategy);
        setStrategyConfig(tpl.defaults ?? {});
        if (!name) setName(tpl.name.toUpperCase().replace(/\s+/g, "_") + "_01");
      }
    }
  }, [searchParams, name]);

  // Build strategy options from templates
  const strategies = AGENT_TEMPLATES.map((t) => ({
    id: t.strategy,
    templateId: t.id,
    name: t.name,
    desc: t.description.slice(0, 60) + "...",
    icon: t.icon,
  }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !strategy || !address) return;

    setErrorMsg("");
    setTxHash("");

    try {
      // Step 1 — Build unsigned XDR via API (also stores agent)
      setTxStatus("building");
      const buildRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: address,
          name,
          strategy,
          templateId,
          strategyConfig,
        }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json();
        throw new Error(data.error || "Failed to build transaction");
      }

      const { xdr, contractId: cid, agentId } = await buildRes.json();
      setContractId(cid);
      setAgentStoreId(agentId);

      // Step 2 — Sign with wallet
      setTxStatus("signing");
      const signedXdr = await signTx(xdr);

      // Step 3 — Submit to Soroban RPC
      setTxStatus("submitting");
      const submitRes = await fetch("/api/stellar/submit-soroban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signedXdr }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || "Failed to submit transaction");
      }

      const result = await submitRes.json();

      if (result.status === "SUCCESS" || result.status === "PENDING") {
        setTxHash(result.hash);
        setTxStatus("success");

        // Update the stored agent with the TX hash
        if (agentId) {
          fetch(`/api/agents/${agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash: result.hash }),
          }).catch(() => {});
        }
      } else {
        setTxHash(result.hash);
        throw new Error("Transaction failed on-chain");
      }
    } catch (err) {
      setTxStatus("failed");
      setErrorMsg(getErrorMessage(err));
    }
  }

  const isWorking = ["building", "signing", "submitting"].includes(txStatus);

  const statusLabel: Record<TxStatus, string> = {
    idle: "READY",
    building: "BUILDING_TX...",
    signing: "AWAITING_SIGNATURE...",
    submitting: "SUBMITTING_TO_SOROBAN...",
    success: "DEPLOYED",
    failed: "FAILED",
  };

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
              <div className="text-xs font-semibold tracking-widest">AGENTS // CREATE_NEW</div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Configure and deploy a new AI agent to Soroban
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {!connected ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center">
              <div className="text-sm text-muted">&gt; Connect your wallet to create agents</div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="max-w-xl space-y-6">
              {/* Agent Name */}
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted">AGENT_NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. REBALANCER_01"
                  disabled={isWorking || txStatus === "success"}
                  className="w-full border border-border/40 bg-surface/80 px-4 py-2.5 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                />
              </div>

              {/* Strategy Selection (from templates) */}
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted">STRATEGY_TYPE</label>
                <div className="space-y-2">
                  {strategies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (!isWorking && txStatus !== "success") {
                          setStrategy(s.id);
                          setTemplateId(s.templateId);
                          const tpl = getTemplate(s.templateId);
                          setStrategyConfig(tpl?.defaults ?? {});
                        }
                      }}
                      className={`flex w-full items-center justify-between border px-4 py-3 text-left transition-colors ${
                        strategy === s.id
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border/40 bg-surface/80 text-muted hover:bg-surface-2/80"
                      } ${isWorking || txStatus === "success" ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{s.icon}</span>
                        <div>
                          <div className="text-xs font-semibold tracking-wider">{s.name}</div>
                          <div className="mt-0.5 text-[10px] tracking-wider opacity-70">{s.desc}</div>
                        </div>
                      </div>
                      {strategy === s.id && (
                        <span className="text-[10px] font-bold tracking-widest">SELECTED</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy-specific configuration */}
              {strategy === "auto_rebalance" && (
                <div>
                  <label className="mb-2 block text-[10px] tracking-widest text-muted">
                    AUTO_REBALANCE_CONFIG
                  </label>
                  <div className="space-y-3 border border-border/40 bg-surface/80 px-4 py-3">
                    <div>
                      <span className="mb-1 block text-[9px] tracking-widest text-muted">
                        RECIPIENT (REBALANCE TARGET)
                      </span>
                      <input
                        type="text"
                        value={(strategyConfig.recipient as string) ?? ""}
                        onChange={(e) =>
                          setStrategyConfig((prev) => ({
                            ...prev,
                            recipient: e.target.value,
                          }))
                        }
                        placeholder="GDESTINATION..."
                        disabled={isWorking || txStatus === "success"}
                        className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="mb-1 block text-[9px] tracking-widest text-muted">
                          TARGET_RATIO (%)
                        </span>
                        <input
                          type="number"
                          value={
                            (strategyConfig.targetRatio as number | undefined) ?? 50
                          }
                          onChange={(e) =>
                            setStrategyConfig((prev) => ({
                              ...prev,
                              targetRatio: Number(e.target.value || 0),
                            }))
                          }
                          disabled={isWorking || txStatus === "success"}
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-[9px] tracking-widest text-muted">
                          CHECK_INTERVAL (s)
                        </span>
                        <input
                          type="number"
                          value={
                            (strategyConfig.checkInterval as number | undefined) ??
                            3600
                          }
                          onChange={(e) =>
                            setStrategyConfig((prev) => ({
                              ...prev,
                              checkInterval: Number(e.target.value || 0),
                            }))
                          }
                          disabled={isWorking || txStatus === "success"}
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-[9px] tracking-widest text-muted">
                          THRESHOLD_XLM
                        </span>
                        <input
                          type="number"
                          value={
                            (strategyConfig.thresholdXlm as number | undefined) ?? 1
                          }
                          onChange={(e) =>
                            setStrategyConfig((prev) => ({
                              ...prev,
                              thresholdXlm: Number(e.target.value || 0),
                            }))
                          }
                          disabled={isWorking || txStatus === "success"}
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deploy Button */}
              {txStatus !== "success" && (
                <button
                  type="submit"
                  disabled={!name.trim() || !strategy || isWorking}
                  className="w-full border border-accent/50 bg-accent/10 py-2.5 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
                >
                  {isWorking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {statusLabel[txStatus]}
                    </span>
                  ) : (
                    "> DEPLOY_AGENT"
                  )}
                </button>
              )}

              {/* Success */}
              {txStatus === "success" && (
                <div className="space-y-3 border border-accent/40 bg-accent/5 px-4 py-4">
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold tracking-widest">AGENT DEPLOYED</span>
                  </div>
                  {contractId && (
                    <div className="text-[10px] tracking-wider text-muted">
                      CONTRACT: <span className="text-foreground">{contractId}</span>
                    </div>
                  )}
                  {txHash && (
                    <a
                      href={txExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-accent underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on Stellar Explorer
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="mt-2 w-full border border-border/40 bg-surface-2/50 py-2 text-[10px] tracking-widest text-muted transition-colors hover:text-foreground"
                  >
                    &gt; BACK_TO_DASHBOARD
                  </button>
                </div>
              )}

              {/* Error */}
              {txStatus === "failed" && errorMsg && (
                <div className="space-y-2 border border-red-500/40 bg-red-500/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold tracking-widest">DEPLOYMENT FAILED</span>
                  </div>
                  <div className="text-[10px] tracking-wider text-red-400">&gt; {errorMsg}</div>
                  {txHash && (
                    <a
                      href={txExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-accent underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View failed tx on Explorer
                    </a>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </main>

      {/* Right sidebar — deploy info */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">DEPLOY_STATUS</div>
        </div>
        <div className="space-y-3 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div className="flex items-center justify-between">
            <span>NETWORK</span>
            <span className="text-foreground">TESTNET</span>
          </div>
          <div className="flex items-center justify-between">
            <span>RUNTIME</span>
            <span className="text-foreground">SOROBAN</span>
          </div>
          <div className="flex items-center justify-between">
            <span>STATUS</span>
            <span
              className={
                txStatus === "success"
                  ? "text-accent"
                  : txStatus === "failed"
                  ? "text-red-400"
                  : isWorking
                  ? "text-yellow-500"
                  : "text-foreground"
              }
            >
              {statusLabel[txStatus]}
            </span>
          </div>
          {contractId && (
            <>
              <div className="border-t border-border/40 pt-2">CONTRACT_ID</div>
              <div className="break-all text-foreground/80">{contractId}</div>
            </>
          )}
        </div>
      </aside>
    </HudShell>
  );
}
