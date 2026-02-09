import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  LayoutGrid,
  Users,
  Store,
  BarChart3,
  Settings,
  Mic,
  ArrowUp,
} from "lucide-react";

/* ── Static data ── */
const navItems = [
  { label: "./dashboard", icon: LayoutGrid, active: true },
  { label: "./agents", icon: Users },
  { label: "./marketplace", icon: Store },
  { label: "./analytics", icon: BarChart3 },
];

const processes = [
  {
    name: "AGENT_ALPHA",
    id: "BA29",
    mode: "EXEC",
    status: "ACTIVE" as const,
    detail: "OPS/SEC",
    value: "450",
    progress: 75,
  },
  {
    name: "AGENT_BETA",
    id: "4B01",
    mode: "WAIT",
    status: "IDLE" as const,
    detail: "> Waiting for liquidity...",
  },
  {
    name: "AGENT_GAMMA",
    id: "X992",
    mode: "ERR",
    status: "ERROR" as const,
    detail: "> Horizon API timeout. Retrying...",
  },
];

const logs = [
  "[16:42:05] Node synchronization started",
  "[16:42:06] Connection established to Stellar Mainnet",
  "[16:43:12] Ledger 459261 verified",
  "[16:43:15] Updating local state...",
];

/* ── Page ── */
export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden font-[family-name:var(--font-geist-mono)]">
      {/* ─── Top Status Bar ─── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-surface px-4 py-1.5 text-[11px] tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            STELLAR_OS V2.4.1
          </span>
          <span className="text-muted">|</span>
          <span className="text-muted">MEM_ALLOC: 45MB / 128MB</span>
          <span className="text-muted">CPU_LOAD: 0.12, 0.08, 0.04</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted">SERVER: US-EAST-1</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-accent">CONNECTED</span>
          </span>
          <span className="text-muted">UTF-8</span>
        </div>
      </header>

      {/* ─── Content: Sidebar | Main | Right Panel ─── */}
      <div className="flex min-h-0 flex-1">
        {/* ─── Left Sidebar ─── */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-border/60 bg-surface">
          <div className="border-b border-border/40 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-widest">
              <span className="text-accent">✦</span> STELLAR_AI
            </div>
            <div className="mt-1.5 text-[10px] tracking-wider text-muted">
              &gt; INITIALIZING NETWORK... OK
            </div>
          </div>

          <div className="flex-1 px-3 py-3">
            <div className="mb-2 px-1 text-[10px] tracking-widest text-muted">
              // NAVIGATION
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  className={`flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs tracking-wider transition-colors ${
                    item.active
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="border-t border-border/40 px-3 py-2">
            <a
              href="#"
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs tracking-wider text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              ./config
            </a>
          </div>

          <div className="border-t border-border/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-[10px] font-bold">
                JD
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider">
                  ADMIN_USER
                </div>
                <div className="text-[10px] tracking-wider text-muted">
                  ROOT_ACCESS: <span className="text-accent">TRUE</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Center Content ─── */}
        <main className="hud-grid flex min-w-0 flex-1 flex-col">
          {/* Terminal prompt bar */}
          <div className="flex items-center justify-between border-b border-border/40 bg-surface/50 px-4 py-2 text-xs">
            <span className="text-muted">
              root@stellar-os:~/agents/alpha-01 ${" "}
              <span className="inline-block h-3.5 w-1.5 animate-pulse bg-foreground" />
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted">
                PID: 8492
              </span>
              <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted">
                SECURE
              </span>
            </div>
          </div>

          {/* Chat / Agent Conversation */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Agent message 1 */}
            <div>
              <div className="text-[10px] tracking-wider text-accent">
                agent_alpha{" "}
                <span className="text-muted">@ 10:42:01</span>
              </div>
              <div className="mt-2 border border-border/40 bg-surface/80 px-4 py-3 text-sm leading-relaxed">
                &gt; I have successfully deployed the smart contract on the{" "}
                <strong>Stellar Testnet</strong>. Initial verification passed.
              </div>
              <div className="mt-2 border border-border/40 bg-surface/80 px-4 py-2 text-xs">
                <span className="text-accent font-semibold">[SUCCESS]</span>{" "}
                <span className="text-muted">TX_HASH:</span>{" "}
                <span className="font-semibold">TABC...XYZ</span>
              </div>
            </div>

            {/* User message (right-aligned) */}
            <div className="flex flex-col items-end">
              <div className="text-[10px] tracking-wider text-muted">
                admin_user <span>@ 10:42:45</span>
              </div>
              <div className="mt-2 max-w-lg border border-border/40 bg-surface-2/80 px-4 py-3 text-sm leading-relaxed">
                Great work. Can you analyze the fee surge for the last hour on
                the network?
              </div>
            </div>

            {/* Agent message 2 */}
            <div>
              <div className="text-[10px] tracking-wider text-accent">
                agent_alpha{" "}
                <span className="text-muted">@ 10:42:58</span>
              </div>
              <div className="mt-2 border border-border/40 bg-surface/80 px-4 py-3 text-sm leading-relaxed">
                &gt; Analyzing network activity...{" "}
                <span className="font-semibold text-accent">DONE</span>. Fees
                are currently stable at an average of 100 stroops.
              </div>
            </div>

            {/* Data Buffer Visualization */}
            <div>
              <div className="text-[10px] tracking-wider text-muted">
                &gt;&gt; VISUALIZING DATA BUFFER:
              </div>
              <div className="mt-2 border border-border/40 bg-surface/60 p-4">
                <div className="flex h-28 items-end gap-3">
                  {[40, 50, 55, 65, 48, 85, 35, 52, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      {i === 5 && (
                        <span className="text-[8px] tracking-wider text-muted">
                          PEAK
                        </span>
                      )}
                      <div
                        className={`w-full ${
                          i === 5 ? "bg-foreground/60" : "bg-foreground/20"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] tracking-wider text-muted">
                  <span>T-60M</span>
                  <span>NOW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Command Input */}
          <div className="border-t border-border/40 bg-surface/50 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-accent">&gt;</span>
              <input
                type="text"
                placeholder="Enter command or message..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
              />
              <button className="p-1.5 text-muted transition-colors hover:text-foreground">
                <Mic className="h-4 w-4" />
              </button>
              <button className="rounded border border-border/60 bg-surface-2 p-1.5 text-muted transition-colors hover:text-foreground">
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] tracking-wider text-muted">
              <span>
                STATUS: <span className="text-accent">LISTENING</span>
              </span>
              <span>MODE: INTERACTIVE</span>
            </div>
          </div>
        </main>

        {/* ─── Right Sidebar ─── */}
        <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border/60 bg-surface">
          {/* System Status Header */}
          <div className="border-b border-border/40 px-4 py-3">
            <div className="text-xs font-semibold tracking-widest">
              SYSTEM_STATUS
            </div>
          </div>

          {/* Wallet Module */}
          <div className="border-b border-border/40 px-4 py-4">
            <div className="flex items-center justify-between text-[10px] tracking-wider text-muted">
              <span>// WALLET_MODULE</span>
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">
                SYNCED
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">
              $128,400.52
            </div>
            <div className="mt-1 text-[11px] text-accent">
              &gt; +2.4% (24H) INCREMENT
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between border border-border/40 px-3 py-1.5 text-xs">
                <span className="text-muted">XLM_BAL</span>
                <span>150,000.00</span>
              </div>
              <div className="flex items-center justify-between border border-border/40 px-3 py-1.5 text-xs">
                <span className="text-muted">USDC_BAL</span>
                <span>5,000.00</span>
              </div>
            </div>

            <button className="mt-3 w-full border border-border/40 bg-surface-2 py-2 text-[11px] tracking-wider transition-colors hover:bg-border/20">
              &gt; VIEW TRANSACTION LOG
            </button>
          </div>

          {/* Stats Grid */}
          <div className="border-b border-border/40 px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border/40 px-3 py-2">
                <div className="text-[10px] tracking-wider text-muted">
                  LATENCY
                </div>
                <div className="mt-1 text-sm font-semibold">4ms</div>
              </div>
              <div className="border border-border/40 px-3 py-2">
                <div className="text-[10px] tracking-wider text-muted">
                  CPU LOAD
                </div>
                <div className="mt-1 text-sm font-semibold">84%</div>
              </div>
            </div>
            <div className="mt-2 border border-border/40 px-3 py-2">
              <div className="text-[10px] tracking-wider text-muted">
                UPTIME
              </div>
              <div className="mt-1 text-sm font-semibold">99.9%</div>
            </div>
          </div>

          {/* Running Processes */}
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex items-center justify-between text-[10px] tracking-widest">
              <span className="font-semibold">RUNNING_PROCESSES</span>
              <span className="text-muted">COUNT: 3</span>
            </div>

            <div className="mt-3 space-y-2">
              {processes.map((proc) => (
                <div
                  key={proc.name}
                  className={`border px-3 py-2 ${
                    proc.status === "ERROR"
                      ? "border-red-500/30"
                      : "border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold tracking-wider ${
                        proc.status === "ERROR" ? "text-red-400" : ""
                      }`}
                    >
                      {proc.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                        proc.status === "ACTIVE"
                          ? "bg-accent/20 text-accent"
                          : proc.status === "IDLE"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {proc.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] tracking-wider text-muted">
                    ID: {proc.id} // {proc.mode}
                  </div>
                  {proc.progress !== undefined ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>{proc.detail}</span>
                        <span>{proc.value}</span>
                      </div>
                      <div className="mt-1 h-1 w-full bg-border/30">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${proc.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] text-muted">
                      {proc.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Log Entries */}
          <div className="px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
            {logs.map((log, i) => (
              <div key={i}>&gt; {log}</div>
            ))}
          </div>
        </aside>
      </div>

      {/* ─── Bottom Status Bar (vim-style) ─── */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border/60 bg-surface px-4 py-1 text-[11px] tracking-wider text-muted">
        <span>
          MODE: VISUAL &nbsp;&nbsp;-- INSERT --
        </span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span>Ln 42, Col 18 &nbsp;100%</span>
        </div>
      </footer>
    </div>
  );
}
