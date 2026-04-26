import { NextResponse } from "next/server";
import { deleteCachedByPrefix } from "@/lib/cache/cache";
import { getPrismaClient } from "@/lib/db/client";
import { upsertDailyStats } from "@/lib/analytics/platform-metrics";
import { createLogger, logCronRun } from "@/lib/logging/logger";

const log = createLogger("cron/analytics-rollup");

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStart = Date.now();
  log.info("cron started");

  try {
    const url = new URL(request.url);
    const daysParam = Number(url.searchParams.get("days") ?? "7");
    const includeToday = url.searchParams.get("includeToday") === "true";
    const days = Number.isFinite(daysParam)
      ? Math.min(Math.max(Math.trunc(daysParam), 1), 30)
      : 7;

    const prisma = getPrismaClient();
    const todayStart = startOfUtcDay(new Date());
    const endDate = includeToday ? todayStart : addUtcDays(todayStart, -1);
    const processed = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const targetDate = addUtcDays(endDate, -offset);
      const stat = await upsertDailyStats(prisma, targetDate);
      processed.push({
        date: stat.date,
        executions: stat.executions,
        dau: stat.dau,
        successRate: stat.successRate,
      });
    }

    deleteCachedByPrefix("analytics:metrics:");
    deleteCachedByPrefix("analytics:public-metrics:");

    logCronRun("cron/analytics-rollup", {
      processed: processed.length,
      durationMs: Date.now() - cronStart,
      days,
    });

    return NextResponse.json({
      ok: true,
      days,
      includeToday,
      processed: processed.length,
      stats: processed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analytics rollup failed";
    log.error(message, { durationMs: Date.now() - cronStart });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
