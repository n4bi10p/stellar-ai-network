export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,44,62,0.16),transparent_70%)]" />
        <div className="absolute right-8 top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(34,44,62,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-[radial-gradient(circle,rgba(34,44,62,0.1),transparent_70%)]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 px-6 pb-10 pt-4 lg:grid-cols-[240px_1fr_280px]">
        <aside className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">
              Stellar
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted">
              Testnet
            </span>
          </div>
          <div className="mt-6 space-y-1 text-sm">
            {[
              "Overview",
              "Agents",
              "Transactions",
              "Templates",
              "Analytics",
            ].map((item, index) => (
              <div
                key={item}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                  index === 0
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:bg-surface-2"
                }`}
              >
                <span>{item}</span>
                <span className="text-xs text-muted">{index + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-background px-3 py-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">
              Active Wallet
            </div>
            <div className="mt-3 font-mono text-xs text-foreground">
              GAB2...9FXD
            </div>
            <div className="mt-2 text-xs text-muted">Balance</div>
            <div className="text-lg font-semibold text-foreground">
              152.40 XLM
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Command Center
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-foreground">
                  Stellar AI Agent Network
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  Build autonomous agents for the Stellar testnet. Draft a
                  command, review intent, and execute with confidence.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground">
                  View Roadmap
                </button>
                <button className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-background">
                  New Agent
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Active Agents", value: "06" },
                { label: "Queued Tasks", value: "14" },
                { label: "Success Rate", value: "98%" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-background/70 p-4"
                >
                  <div className="text-xs text-muted">{stat.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Draft Command
                </h2>
                <span className="text-xs text-muted">Gemini</span>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-6">
                <p className="text-sm text-muted">
                  Send 25 XLM to GAB2...9FXD every Friday at 9AM.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full border border-border px-3 py-1">
                  Parsed: Scheduled Payment
                </span>
                <span className="rounded-full border border-border px-3 py-1">
                  Needs Review
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-background">
                  Confirm
                </button>
                <button className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground">
                  Edit
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Recent Activity
                </h2>
                <span className="text-xs text-muted">Last 24h</span>
              </div>
              <div className="mt-5 space-y-4">
                {["Rebalanced 4 pools", "Executed 2 payouts", "Queued 1 agent"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex items-start justify-between rounded-xl border border-border bg-background/70 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm text-foreground">{item}</div>
                        <div className="text-xs text-muted">{index + 1}m ago</div>
                      </div>
                      <span className="text-xs text-muted">+{index + 2}</span>
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        </main>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">
              Live Status
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">
              3 Agents Running
            </div>
            <div className="mt-2 text-sm text-muted">
              Network stable. Next execution in 12m.
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              Testnet Online
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Agent Queue
              </h2>
              <span className="text-xs text-muted">Today</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { name: "Scheduler", status: "Queued" },
                { name: "Treasury", status: "Running" },
                { name: "Arb Watch", status: "Paused" },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3"
                >
                  <div>
                    <div className="text-sm text-foreground">{agent.name}</div>
                    <div className="text-xs text-muted">{agent.status}</div>
                  </div>
                  <span className="text-xs text-muted">View</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
