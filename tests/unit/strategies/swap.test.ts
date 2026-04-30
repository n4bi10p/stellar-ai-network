import { describe, expect, it } from "vitest";
import { decideSwap } from "@/lib/agents/strategies/swap";
import type { StrategyContext } from "@/lib/agents/strategies/types";

describe("Swap Strategy", () => {
  it("should fail if config is missing", async () => {
    const ctx: StrategyContext = {
      agent: {
        id: "a1",
        owner: "G_OWNER",
        contractId: "C1",
        name: "test",
        strategy: "swap",
        templateId: "swap",
        createdAt: new Date().toISOString(),
        txHash: "hash",
      },
      now: new Date(),
    };
    const decision = await decideSwap(ctx);
    expect(decision.shouldExecute).toBe(false);
    expect(decision.reason).toMatch(/Missing strategy config/i);
  });

  it("should fail if amountIn is invalid", async () => {
    const ctx: StrategyContext = {
      agent: {
        id: "a1",
        owner: "G_OWNER",
        contractId: "C1",
        name: "test",
        strategy: "swap",
        templateId: "swap",
        createdAt: new Date().toISOString(),
        txHash: "hash",
        strategyConfig: {
          tokenIn: "native",
          tokenOut: "USDC:G_ISSUER",
          amountIn: -10,
          triggerType: "manual",
        },
      },
      now: new Date(),
    };
    const decision = await decideSwap(ctx);
    expect(decision.shouldExecute).toBe(false);
    expect(decision.reason).toMatch(/Invalid amountIn config/i);
  });

  it("should trigger manual execution immediately", async () => {
    const ctx: StrategyContext = {
      agent: {
        id: "a1",
        owner: "G_OWNER",
        contractId: "C1",
        name: "test",
        strategy: "swap",
        templateId: "swap",
        createdAt: new Date().toISOString(),
        txHash: "hash",
        strategyConfig: {
          tokenIn: "native",
          tokenOut: "USDC:G_ISSUER",
          amountIn: 10,
          triggerType: "manual",
        },
      },
      now: new Date(),
    };
    const decision = await decideSwap(ctx);
    expect(decision.shouldExecute).toBe(true);
    expect(decision.reason).toMatch(/Manual execution/i);
    expect(decision.amountXlm).toBe(10); // Native token requires XLM spend limit check
    expect(decision.xdrBuilder).toBeDefined();
  });

  it("should not execute if scheduled interval has not elapsed", async () => {
    const now = new Date("2026-04-30T12:00:00Z");
    const lastExecutionAt = new Date("2026-04-30T11:50:00Z").toISOString(); // 10 minutes ago
    const ctx: StrategyContext = {
      agent: {
        id: "a1",
        owner: "G_OWNER",
        contractId: "C1",
        name: "test",
        strategy: "swap",
        templateId: "swap",
        createdAt: new Date().toISOString(),
        txHash: "hash",
        lastExecutionAt,
        strategyConfig: {
          tokenIn: "native",
          tokenOut: "USDC:G_ISSUER",
          amountIn: 10,
          triggerType: "scheduled",
          intervalSeconds: 3600, // 1 hour
        },
      },
      now,
    };
    const decision = await decideSwap(ctx);
    expect(decision.shouldExecute).toBe(false);
    expect(decision.nextExecutionAt).toBe(new Date("2026-04-30T12:50:00Z").toISOString());
  });
});
