"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Power,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { readConfig } from "@/lib/stellar/contracts";
import { txExplorerUrl } from "@/lib/utils/constants";
import { getErrorMessage } from "@/lib/utils/errors";

type TxStatus = "idle" | "building" | "signing" | "submitting" | "success" | "failed";

interface AgentData {
  owner: string;
  name: string;
  strategy: string;
  active: boolean;
  executions: number;
}

interface ReminderPrefs {
  channels?: {
    inApp?: boolean;
    email?: boolean;
    telegram?: boolean;
    discord?: boolean;
  };
  emailAddress?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  digestMode?: "instant" | "daily";
}

export default function AgentDetailPage() {
  const params = useParams();
  const contractId = params.id as string;

  const { connected, address, signTx } = useWallet();

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Execute state (manual)
  const [execRecipient, setExecRecipient] = useState("");
  const [execAmount, setExecAmount] = useState("");
  const [execStatus, setExecStatus] = useState<TxStatus>("idle");
  const [execHash, setExecHash] = useState("");
  const [execError, setExecError] = useState("");

  // Auto-execute state (strategy-driven)
  const [autoExecLoading, setAutoExecLoading] = useState(false);
  const [autoExecError, setAutoExecError] = useState("");
  const [autoExecReason, setAutoExecReason] = useState("");
  const [autoExecHash, setAutoExecHash] = useState("");

  // Toggle state
  const [toggling, setToggling] = useState(false);

  // Reminder prefs (stored agent metadata)
  const [agentStoreId, setAgentStoreId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderPrefs>({});
  const [remindersSaving, setRemindersSaving] = useState(false);
  const [remindersError, setRemindersError] = useState("");
  const [remindersSaved, setRemindersSaved] = useState(false);

  // Fetch on-chain config
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await readConfig(contractId);
      if (cfg) {
        setAgent({
          owner: cfg.owner,
          name: cfg.name,
          strategy: cfg.strategy,
          active: cfg.active,
          executions: cfg.executions,
        });
      }
    } catch {
      // contract may not exist
    } finally {
      setLoadingConfig(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch stored agent metadata for reminders
  const fetchStoredAgent = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      if (!res.ok) throw new Error("Failed to load agent metadata");
      const { agents } = await res.json();
      const matching = (agents as Array<{ id: string; contractId: string; createdAt: string; reminders?: ReminderPrefs }>)
        .filter((a) => a.contractId === contractId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = matching[0];
      if (latest) {
        setAgentStoreId(latest.id);
        setReminders(latest.reminders ?? {});
      }
    } catch (err) {
      console.error("Failed to load reminders:", err);
    }
  }, [address, contractId]);

  useEffect(() => {
    if (connected && address) fetchStoredAgent();
  }, [connected, address, fetchStoredAgent]);

  // Execute agent
  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    if (!execRecipient || !execAmount || !address) return;

    setExecError("");
    setExecHash("");

    try {
      setExecStatus("building");
      const buildRes = await fetch("/api/agents/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          recipient: execRecipient,
          amount: execAmount,
          sourceAddress: address,
        }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json();
        throw new Error(data.error || "Failed to build execute tx");
      }

      const { xdr } = await buildRes.json();

      setExecStatus("signing");
      const signedXdr = await signTx(xdr);

      setExecStatus("submitting");
      const submitRes = await fetch("/api/stellar/submit-soroban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signedXdr }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || "Submission failed");
      }

      const result = await submitRes.json();

      if (result.status === "SUCCESS" || result.status === "PENDING") {
        setExecHash(result.hash);
        setExecStatus("success");
        // Refresh config to get updated execution count
        await fetchConfig();
      } else {
        setExecHash(result.hash);
        throw new Error("Execution failed on-chain");
      }
    } catch (err) {
      setExecStatus("failed");
      setExecError(getErrorMessage(err));
    }
  }

  // AUTO_EXECUTE_NOW — invoke strategy engine on server
  async function handleAutoExecuteNow() {
    if (!address || !agent) return;

    setAutoExecError("");
    setAutoExecReason("");
    setAutoExecHash("");
    setAutoExecLoading(true);

    try {
      const res = await fetch(`/api/agents/${contractId}/auto-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAddress: address }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || data?.message || "Auto execution failed";
        throw new Error(msg);
      }

      setAutoExecReason(data.reason || "");

      if (data.executed && data.txHash) {
        setAutoExecHash(data.txHash as string);
        // Refresh on-chain executions count
        await fetchConfig();
      }
    } catch (err) {
      setAutoExecError(getErrorMessage(err));
    } finally {
      setAutoExecLoading(false);
    }
  }

  // Toggle active state
  const [toggleError, setToggleError] = useState("");

  async function handleToggle() {
    if (!address) return;
    setToggling(true);
    setToggleError("");
    try {
      // Step 1 — Build toggle_active XDR
      const buildRes = await fetch("/api/agents/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, sourceAddress: address }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json();
        throw new Error(data.error || "Failed to build toggle transaction");
      }

      const { xdr } = await buildRes.json();

      // Step 2 — Sign with wallet
      const signedXdr = await signTx(xdr);

      // Step 3 — Submit to Soroban RPC
      const submitRes = await fetch("/api/stellar/submit-soroban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signedXdr }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || "Submission failed");
      }

      const result = await submitRes.json();

      if (result.status === "SUCCESS" || result.status === "PENDING") {
        // Refresh config to reflect new active state
        await fetchConfig();
      } else {
        throw new Error("Toggle transaction failed on-chain");
      }
    } catch (err) {
      setToggleError(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  async function handleSaveReminders() {
    if (!agentStoreId) return;
    setRemindersSaving(true);
    setRemindersError("");
    setRemindersSaved(false);
    try {
      const res = await fetch(`/api/agents/${agentStoreId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminders),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save reminders");
      }
      setRemindersSaved(true);
    } catch (err) {
      setRemindersError(getErrorMessage(err));
    } finally {
      setRemindersSaving(false);
    }
  }

  const isExecWorking = ["building", "signing", "submitting"].includes(execStatus);

  const statusLabels: Record<TxStatus, string> = {
    idle: "",
    building: "BUILDING_TX...",
    signing: "AWAITING_SIGNATURE...",
    submitting: "SUBMITTING...",
    success: "SUCCESS",
    failed: "FAILED",
  };

  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="text-xs font-semibold tracking-widest">
                  AGENTS // {agent?.name ?? contractId.slice(0, 12)}
                </div>
                <div className="mt-1 text-[10px] tracking-wider text-muted">
                  &gt; Agent detail &amp; execution
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent && (
                <>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                      agent.active ? "bg-accent/20 text-accent" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {agent.active ? "ACTIVE" : "STOPPED"}
                  </span>
                  <button
                    onClick={handleToggle}
                    disabled={toggling || !connected}
                    className="flex items-center gap-1 rounded border border-border/40 px-2.5 py-1 text-[10px] tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                    TOGGLE
                  </button>
                  {toggleError && (
                    <span className="text-[9px] text-red-400">{toggleError}</span>
                  )}
                </>
              )}
              <button
                onClick={fetchConfig}
                className="rounded border border-border/40 p-1.5 text-muted transition-colors hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {loadingConfig ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading contract config...
            </div>
          ) : !agent ? (
            <div className="border border-border/40 bg-surface/80 px-6 py-8 text-center text-sm text-muted">
              &gt; Could not load agent config. Contract may not be initialized.
            </div>
          ) : (
            <>
              {/* Agent info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="text-[10px] tracking-wider text-muted">STRATEGY</div>
                  <div className="mt-1 text-sm font-semibold">{agent.strategy}</div>
                </div>
                <div className="border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="text-[10px] tracking-wider text-muted">EXECUTIONS</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-3.5 w-3.5 text-accent" />
                    {agent.executions}
                  </div>
                </div>
                <div className="col-span-2 border border-border/40 bg-surface/80 px-4 py-3">
                  <div className="text-[10px] tracking-wider text-muted">CONTRACT_ID</div>
                  <div className="mt-1 text-xs font-mono break-all text-muted">{contractId}</div>
                </div>
              </div>

              {/* Execute Agent */}
              <div className="mt-6">
                <div className="mb-3 text-[10px] tracking-widest text-muted">
                  {"// EXECUTE_AGENT"}
                </div>
                {!connected ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-6 text-center text-sm text-muted">
                    &gt; Connect wallet to execute agent actions
                  </div>
                ) : (
                  <form onSubmit={handleExecute} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] tracking-widest text-muted">RECIPIENT</label>
                      <input
                        type="text"
                        value={execRecipient}
                        onChange={(e) => setExecRecipient(e.target.value)}
                        placeholder="GXXX..."
                        disabled={isExecWorking}
                        className="w-full border border-border/40 bg-surface/80 px-4 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] tracking-widest text-muted">AMOUNT (XLM)</label>
                      <input
                        type="text"
                        value={execAmount}
                        onChange={(e) => setExecAmount(e.target.value)}
                        placeholder="10"
                        disabled={isExecWorking}
                        className="w-full border border-border/40 bg-surface/80 px-4 py-2 text-sm outline-none placeholder:text-muted/40 focus:border-accent/50 disabled:opacity-50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!execRecipient || !execAmount || isExecWorking || !agent.active}
                      className="flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2.5 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
                    >
                      {isExecWorking ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {statusLabels[execStatus]}
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          EXECUTE_AGENT
                        </>
                      )}
                    </button>

                    {!agent.active && (
                      <div className="text-[10px] tracking-wider text-red-400">
                        &gt; Agent is INACTIVE. Toggle it on to execute.
                      </div>
                    )}

                    {/* Exec success */}
                    {execStatus === "success" && execHash && (
                      <div className="flex items-center gap-2 border border-accent/40 bg-accent/5 px-4 py-3 text-[10px]">
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="tracking-wider text-accent">EXECUTION SUCCESS</span>
                        <a
                          href={txExplorerUrl(execHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-accent underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Explorer
                        </a>
                      </div>
                    )}

                    {/* Exec fail */}
                    {execStatus === "failed" && execError && (
                      <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/5 px-4 py-3 text-[10px]">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="tracking-wider text-red-400">{execError}</span>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* AUTO EXECUTION */}
              <div className="mt-6">
                <div className="mb-3 text-[10px] tracking-widest text-muted">
                  {"// AUTO_EXECUTION"}
                </div>
                {!connected ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-4 text-center text-[10px] text-muted">
                    &gt; Connect wallet (owner account) to run AUTO_EXECUTE_NOW
                  </div>
                ) : (
                  <div className="space-y-3 border border-border/40 bg-surface/80 px-4 py-4 text-[10px] tracking-wider">
                    <button
                      type="button"
                      onClick={handleAutoExecuteNow}
                      disabled={autoExecLoading || !agent.active}
                      className="flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
                    >
                      {autoExecLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          RUNNING_STRATEGY...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          AUTO_EXECUTE_NOW
                        </>
                      )}
                    </button>

                    {!agent.active && (
                      <div className="text-[10px] text-red-400">
                        &gt; Agent is INACTIVE. Toggle it on to run auto execution.
                      </div>
                    )}

                    {autoExecReason && (
                      <div className="border border-border/30 bg-surface/70 px-3 py-2">
                        <div className="mb-1 text-[9px] font-semibold tracking-widest text-muted">
                          STRATEGY_REASON
                        </div>
                        <div className="text-[10px] leading-relaxed">
                          &gt; {autoExecReason}
                        </div>
                      </div>
                    )}

                    {autoExecHash && (
                      <div className="flex items-center gap-2 border border-accent/40 bg-accent/5 px-3 py-2">
                        <CheckCircle className="h-3.5 w-3.5 text-accent" />
                        <span className="text-[10px] tracking-wider text-accent">
                          AUTO EXECUTION SUCCESS
                        </span>
                        <a
                          href={txExplorerUrl(autoExecHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-[10px] text-accent underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Explorer
                        </a>
                      </div>
                    )}

                    {autoExecError && (
                      <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/5 px-3 py-2 text-[10px]">
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                        <span className="tracking-wider text-red-400">
                          {autoExecError}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* REMINDERS */}
              <div className="mt-6">
                <div className="mb-3 text-[10px] tracking-widest text-muted">
                  {"// REMINDERS"}
                </div>
                {!connected ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-4 text-center text-[10px] text-muted">
                    &gt; Connect wallet to configure reminders
                  </div>
                ) : !agentStoreId ? (
                  <div className="border border-border/40 bg-surface/80 px-4 py-4 text-[10px] text-muted">
                    &gt; No stored agent record found for this contract.
                  </div>
                ) : (
                  <div className="space-y-3 border border-border/40 bg-surface/80 px-4 py-4 text-[10px] tracking-wider">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminders.channels?.inApp ?? true}
                          onChange={(e) =>
                            setReminders((prev) => ({
                              ...prev,
                              channels: { ...(prev.channels ?? {}), inApp: e.target.checked },
                            }))
                          }
                        />
                        IN_APP
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminders.channels?.email ?? false}
                          onChange={(e) =>
                            setReminders((prev) => ({
                              ...prev,
                              channels: { ...(prev.channels ?? {}), email: e.target.checked },
                            }))
                          }
                        />
                        EMAIL
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminders.channels?.telegram ?? false}
                          onChange={(e) =>
                            setReminders((prev) => ({
                              ...prev,
                              channels: { ...(prev.channels ?? {}), telegram: e.target.checked },
                            }))
                          }
                        />
                        TELEGRAM
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminders.channels?.discord ?? false}
                          onChange={(e) =>
                            setReminders((prev) => ({
                              ...prev,
                              channels: { ...(prev.channels ?? {}), discord: e.target.checked },
                            }))
                          }
                        />
                        DISCORD
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-[9px] tracking-widest text-muted">EMAIL_ADDRESS</div>
                        <input
                          type="email"
                          value={reminders.emailAddress ?? ""}
                          onChange={(e) =>
                            setReminders((prev) => ({ ...prev, emailAddress: e.target.value }))
                          }
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-xs outline-none placeholder:text-muted/40 focus:border-accent/50"
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[9px] tracking-widest text-muted">TELEGRAM_CHAT_ID</div>
                        <input
                          type="text"
                          value={reminders.telegramChatId ?? ""}
                          onChange={(e) =>
                            setReminders((prev) => ({ ...prev, telegramChatId: e.target.value }))
                          }
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-xs outline-none placeholder:text-muted/40 focus:border-accent/50"
                          placeholder="123456789"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[9px] tracking-widest text-muted">DISCORD_WEBHOOK_URL</div>
                        <input
                          type="text"
                          value={reminders.discordWebhookUrl ?? ""}
                          onChange={(e) =>
                            setReminders((prev) => ({ ...prev, discordWebhookUrl: e.target.value }))
                          }
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-xs outline-none placeholder:text-muted/40 focus:border-accent/50"
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[9px] tracking-widest text-muted">DIGEST_MODE</div>
                        <select
                          value={reminders.digestMode ?? "instant"}
                          onChange={(e) =>
                            setReminders((prev) => ({
                              ...prev,
                              digestMode: e.target.value as "instant" | "daily",
                            }))
                          }
                          className="w-full border border-border/40 bg-surface/90 px-3 py-2 text-xs outline-none focus:border-accent/50"
                        >
                          <option value="instant">INSTANT</option>
                          <option value="daily">DAILY</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveReminders}
                      disabled={remindersSaving}
                      className="flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
                    >
                      {remindersSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          SAVING...
                        </>
                      ) : (
                        "SAVE_REMINDERS"
                      )}
                    </button>

                    {remindersSaved && (
                      <div className="text-[10px] text-accent">
                        &gt; Reminders saved
                      </div>
                    )}
                    {remindersError && (
                      <div className="text-[10px] text-red-400">
                        &gt; {remindersError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">AGENT_INFO</div>
        </div>
        <div className="flex-1 space-y-2 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div className="flex items-center justify-between">
            <span>STATUS</span>
            <span className={agent?.active ? "text-accent" : "text-red-400"}>
              {agent?.active ? "ACTIVE" : "STOPPED"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>EXECUTIONS</span>
            <span className="text-foreground">{agent?.executions ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>STRATEGY</span>
            <span className="text-foreground">{agent?.strategy ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>NETWORK</span>
            <span className="text-foreground">TESTNET</span>
          </div>
          <div className="flex items-center justify-between">
            <span>RUNTIME</span>
            <span className="text-foreground">SOROBAN</span>
          </div>
          {execStatus !== "idle" && (
            <div className="mt-3 border-t border-border/40 pt-2">
              <div className="font-semibold tracking-widest text-foreground/60">LAST_EXEC</div>
              <div className="mt-1">
                STATUS:{" "}
                <span className={execStatus === "success" ? "text-accent" : execStatus === "failed" ? "text-red-400" : "text-yellow-500"}>
                  {statusLabels[execStatus] || execStatus.toUpperCase()}
                </span>
              </div>
              {execHash && (
                <div className="mt-1">
                  HASH: <span className="text-foreground/80">{execHash.slice(0, 12)}...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </HudShell>
  );
}
