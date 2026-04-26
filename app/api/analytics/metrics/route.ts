// GET /api/analytics/metrics — Serve DailyStats rollups + live platform summary
// Query params:
//   period=7d|30d|90d  (default: 7d)
//   owner=<walletAddress> (optional, filter to owner's agents)

import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";
import { getCached, setCached } from "@/lib/cache/cache";

interface DailyStatsRow {
  date: Date;
  dau: number;
  wau: number;
  mau: number;
  newUsers: number;
  totalUsers: number;
  totalAgents: number;
  runningAgents: number;
  executions: number;
  successfulExecutions: number;
  failedExecutions: number;
  txVolume: number;
  avgTxSize: number;
  successRate: number;
  retention7d: number;
}

function periodDays(period: string): number {
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 7;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const owner = searchParams.get("owner") ?? undefined;

  const cacheKey = `analytics:public-metrics:${period}:${owner ?? "all"}`;
  const cached = getCached<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=60" },
    });
  }

  try {
    const prisma = getPrismaClient();
    const days = periodDays(period);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    // ── Historical daily stats ──────────────────────────────────────────────
    const dailyRows = await prisma.$queryRaw<DailyStatsRow[]>`
      SELECT
        "date", "dau", "wau", "mau",
        "newUsers", "totalUsers", "totalAgents", "runningAgents",
        "executions", "successfulExecutions", "failedExecutions",
        "txVolume", "avgTxSize", "successRate", "retention7d"
      FROM "DailyStats"
      WHERE "date" >= ${startDate}
      ORDER BY "date" ASC
    `;

    // ── Live summary from raw events (reflects today's data) ───────────────
    type LiveSummaryRow = {
      totalExecutions: bigint;
      successfulExecutions: bigint;
      failedExecutions: bigint;
    };

    const liveSummaryRows: LiveSummaryRow[] = owner
      ? await prisma.$queryRaw<LiveSummaryRow[]>`
          SELECT
            COUNT(*) AS "totalExecutions",
            COUNT(*) FILTER (WHERE "status" = 'success') AS "successfulExecutions",
            COUNT(*) FILTER (WHERE "status" = 'failed')  AS "failedExecutions"
          FROM "ExecutionEvent"
          WHERE "createdAt" >= ${startDate}
            AND "userId" IN (SELECT "id" FROM "User" WHERE "walletAddress" = ${owner})
        `
      : await prisma.$queryRaw<LiveSummaryRow[]>`
          SELECT
            COUNT(*) AS "totalExecutions",
            COUNT(*) FILTER (WHERE "status" = 'success') AS "successfulExecutions",
            COUNT(*) FILTER (WHERE "status" = 'failed')  AS "failedExecutions"
          FROM "ExecutionEvent"
          WHERE "createdAt" >= ${startDate}
        `;

    const live = liveSummaryRows[0] ?? {
      totalExecutions: BigInt(0),
      successfulExecutions: BigInt(0),
      failedExecutions: BigInt(0),
    };

    const totalExec = Number(live.totalExecutions);
    const successExec = Number(live.successfulExecutions);
    const failExec = Number(live.failedExecutions);


    // ── Aggregated summary across the period ───────────────────────────────
    const totalDAU = dailyRows.reduce((s, r) => s + r.dau, 0);
    const avgDAU = dailyRows.length > 0 ? Math.round(totalDAU / dailyRows.length) : 0;
    const peakDAU = dailyRows.length > 0 ? Math.max(...dailyRows.map((r) => r.dau)) : 0;
    const latestWAU = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].wau : 0;
    const latestMAU = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].mau : 0;

    const totalTxVolume = dailyRows.reduce((s, r) => s + r.txVolume, 0);
    const avgSuccessRate =
      dailyRows.length > 0
        ? dailyRows.reduce((s, r) => s + r.successRate, 0) / dailyRows.length
        : totalExec > 0
        ? (successExec / totalExec) * 100
        : 0;

    const result = {
      period,
      owner: owner ?? null,
      summary: {
        avgDAU,
        peakDAU,
        latestWAU,
        latestMAU,
        totalExecutions: totalExec,
        successfulExecutions: successExec,
        failedExecutions: failExec,
        successRate: parseFloat(avgSuccessRate.toFixed(2)),
        totalTxVolume: parseFloat(totalTxVolume.toFixed(6)),
      },
      // Daily series for charting
      series: dailyRows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        dau: r.dau,
        wau: r.wau,
        mau: r.mau,
        executions: r.executions,
        successfulExecutions: r.successfulExecutions,
        successRate: r.successRate,
        txVolume: r.txVolume,
        newUsers: r.newUsers,
        totalAgents: r.totalAgents,
        runningAgents: r.runningAgents,
        retention7d: r.retention7d,
      })),
      generatedAt: new Date().toISOString(),
    };

    setCached(cacheKey, result, 60); // cache 60 seconds

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=60" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch analytics metrics";
    console.error("[API analytics/metrics] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
