"use client";

import Link from "next/link";
import { ArrowRight, Layers, Zap, Clock, TrendingUp } from "lucide-react";
import { HudShell } from "@/components/layout/HudShell";
import { AGENT_TEMPLATES } from "@/lib/agents/templates";

const strategyIcons: Record<string, React.ReactNode> = {
  auto_rebalance: <Layers className="h-5 w-5" />,
  recurring_payment: <Clock className="h-5 w-5" />,
  price_alert: <TrendingUp className="h-5 w-5" />,
};

export default function MarketplacePage() {
  return (
    <HudShell>
      <main className="hud-grid flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-surface/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest">
                MARKETPLACE // AGENT_TEMPLATES
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-muted">
                &gt; Browse pre-built agent configurations and deploy with one
                click
              </div>
            </div>
            <Link
              href="/agents/create"
              className="flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20"
            >
              <Zap className="h-3.5 w-3.5" />
              CUSTOM_AGENT
            </Link>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Template count */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] tracking-widest text-muted">
              // {AGENT_TEMPLATES.length} TEMPLATES AVAILABLE
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {AGENT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col border border-border/40 bg-surface/80 transition-colors hover:border-accent/30"
              >
                {/* Template header */}
                <div className="border-b border-border/40 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
                      {strategyIcons[template.strategy] ?? (
                        <Zap className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-wider">
                        {template.name}
                      </div>
                      <div className="text-[10px] tracking-wider text-muted">
                        STRATEGY: {template.strategy}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="flex-1 px-5 py-4">
                  <div className="text-xs leading-relaxed text-muted">
                    {template.description}
                  </div>
                </div>

                {/* Parameters */}
                <div className="border-t border-border/40 px-5 py-3">
                  <div className="mb-2 text-[9px] tracking-widest text-muted">
                    DEFAULT_PARAMETERS
                  </div>
                  <div className="space-y-1">
                    {Object.entries(template.defaults).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-[10px] tracking-wider"
                      >
                        <span className="text-muted">{key}</span>
                        <span className="font-mono text-foreground">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deploy button */}
                <div className="border-t border-border/40 px-5 py-3">
                  <Link
                    href={`/agents/create?template=${template.id}`}
                    className="flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-[11px] font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20"
                  >
                    DEPLOY_TEMPLATE
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon section */}
          <div className="mt-8">
            <div className="mb-3 text-[10px] tracking-widest text-muted">
              // COMING_SOON
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {[
                {
                  name: "DCA Bot",
                  desc: "Dollar-cost average into any Stellar asset",
                },
                {
                  name: "Liquidity Provider",
                  desc: "Auto-provide liquidity to DEX pools",
                },
                {
                  name: "NFT Watcher",
                  desc: "Monitor and auto-bid on Stellar NFTs",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="border border-border/40 bg-surface/40 px-4 py-3 opacity-60"
                >
                  <div className="text-xs font-semibold tracking-wider text-muted">
                    {item.name}
                  </div>
                  <div className="mt-1 text-[10px] tracking-wider text-muted/60">
                    {item.desc}
                  </div>
                  <div className="mt-2 text-[9px] tracking-widest text-muted/40">
                    COMING_SOON
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-surface">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="text-xs font-semibold tracking-widest">
            TEMPLATE_INFO
          </div>
        </div>
        <div className="flex-1 px-4 py-3 text-[10px] leading-relaxed tracking-wider text-muted">
          <div>&gt; Marketplace loaded</div>
          <div>&gt; {AGENT_TEMPLATES.length} templates available</div>
          <div>&gt; Select a template to auto-fill agent configuration</div>
          <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
            HOW_IT_WORKS
          </div>
          <div className="mt-2 space-y-1.5">
            <div>1. Browse available templates</div>
            <div>2. Click DEPLOY_TEMPLATE</div>
            <div>3. Customize name &amp; params</div>
            <div>4. Sign with your wallet</div>
            <div>5. Agent deployed to Soroban</div>
          </div>
          <div className="mt-3 border-t border-border/40 pt-2 text-[9px] tracking-widest">
            STRATEGIES
          </div>
          {AGENT_TEMPLATES.map((t) => (
            <div key={t.id} className="mt-1">
              &gt; {t.icon} {t.name}
            </div>
          ))}
        </div>
      </aside>
    </HudShell>
  );
}
