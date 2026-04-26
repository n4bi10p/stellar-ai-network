import { NextRequest, NextResponse } from "next/server";
import { withCached } from "@/lib/cache/cache";
import {
  computePlatformMetrics,
  resolveAnalyticsPeriod,
} from "@/lib/analytics/platform-metrics";
import { getPrismaClient } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const demoData = {
    period: "7d",
    metrics: {
      totalUsers: 42,
      usersWithWallet: 35,
      totalAgents: 128,
      runningAgents: 87,
      successfulTransactions: 543,
      totalExecutionAttempts: 612,
      successRate: 88.7,
      totalEvents: 2156,
      dau: 19,
      wau: 33,
      retention7d: 57.1,
    },
    breakdowns: {
      executionStatus: [
        { status: "success", count: 543 },
        { status: "failed", count: 45 },
        { status: "pending", count: 24 },
      ],
      topStrategies: [
        { strategy: "auto_rebalance", count: 32 },
        { strategy: "price_alert", count: 28 },
        { strategy: "dca_accumulation", count: 24 },
        { strategy: "hedging", count: 18 },
        { strategy: "yield_farming", count: 12 },
      ],
      transactionType: [
        { type: "agent_execution", count: 421 },
        { type: "manual_transfer", count: 156 },
        { type: "manual_soroban", count: 35 },
      ],
      failureReasons: [
        { reason: "insufficient_balance", count: 14 },
        { reason: "user_rejected", count: 11 },
      ],
    },
    history: [],
    timestamp: new Date().toISOString(),
    isDemo: true,
  } as const;

  const allowDemoFallback =
    process.env.NODE_ENV !== "production" &&
    process.env.ANALYTICS_DEMO_FALLBACK === "true";
  const period = resolveAnalyticsPeriod(
    request.nextUrl.searchParams.get("period")
  );

  try {
    const responseBody = await withCached(
      `analytics:metrics:platform:${period}`,
      async () => computePlatformMetrics(getPrismaClient(), { period }),
      30
    );

    return NextResponse.json(responseBody);
  } catch (error) {
    if (allowDemoFallback) {
      console.warn(
        "[Analytics Metrics] Database unreachable, returning demo data:",
        error instanceof Error ? error.message : String(error)
      );
      return NextResponse.json({ ...demoData, period });
    }

    console.error("[Analytics Metrics] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Analytics data unavailable",
        message: error instanceof Error ? error.message : String(error),
        metrics: {
          totalUsers: 0,
          usersWithWallet: 0,
          totalAgents: 0,
          runningAgents: 0,
          successfulTransactions: 0,
          totalExecutionAttempts: 0,
          successRate: 0,
          totalEvents: 0,
          dau: 0,
          wau: 0,
          retention7d: 0,
        },
        breakdowns: {
          executionStatus: [],
          topStrategies: [],
          transactionType: [],
          failureReasons: [],
        },
        timestamp: new Date().toISOString(),
        isDemo: false,
      },
      { status: 503 }
    );
  }
}
