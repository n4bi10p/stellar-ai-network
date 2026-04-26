import type { PrismaClient } from "@prisma/client";

export type AnalyticsPeriod = "7d" | "30d";

export interface DailyHistoryPoint {
  date: string;
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

export interface PlatformMetricsResponse {
  period: AnalyticsPeriod;
  metrics: {
    totalUsers: number;
    usersWithWallet: number;
    totalAgents: number;
    runningAgents: number;
    successfulTransactions: number;
    totalExecutionAttempts: number;
    successRate: number;
    totalEvents: number;
    dau: number;
    wau: number;
    retention7d: number;
  };
  breakdowns: {
    executionStatus: Array<{ status: string; count: number }>;
    topStrategies: Array<{ strategy: string; count: number }>;
    transactionType: Array<{ type: string; count: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
  };
  history: DailyHistoryPoint[];
  timestamp: string;
  isDemo: boolean;
}

type DailySnapshot = Omit<DailyHistoryPoint, "date"> & {
  date: Date;
  breakdowns: {
    executionStatus: Array<{ status: string; count: number }>;
    transactionType: Array<{ type: string; count: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
  };
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toIsoDate(date: Date): string {
  return startOfUtcDay(date).toISOString();
}

function toPeriodDays(period: AnalyticsPeriod): number {
  return period === "30d" ? 30 : 7;
}

function numericMetadataValue(
  metadata: unknown,
  key: "amountXlm" | "amount"
): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildTransactionTypeBreakdown(
  events: Array<{ metadata: unknown }>
): Record<string, number> {
  return events.reduce<Record<string, number>>(
    (acc, event) => {
      const metadata =
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as { transactionType?: string })
          : null;
      const type = metadata?.transactionType || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    { agent_execution: 0, manual_transfer: 0, manual_soroban: 0, unknown: 0 }
  );
}

function mapDailyStatsRow(row: {
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
}): DailyHistoryPoint {
  return {
    date: row.date.toISOString(),
    dau: row.dau,
    wau: row.wau,
    mau: row.mau,
    newUsers: row.newUsers,
    totalUsers: row.totalUsers,
    totalAgents: row.totalAgents,
    runningAgents: row.runningAgents,
    executions: row.executions,
    successfulExecutions: row.successfulExecutions,
    failedExecutions: row.failedExecutions,
    txVolume: row.txVolume,
    avgTxSize: row.avgTxSize,
    successRate: row.successRate,
    retention7d: row.retention7d,
  };
}

export function resolveAnalyticsPeriod(period: string | null): AnalyticsPeriod {
  return period === "30d" ? "30d" : "7d";
}

export async function buildDailySnapshot(
  prisma: PrismaClient,
  date: Date,
  options?: { windowEnd?: Date }
): Promise<DailySnapshot> {
  const dayStart = startOfUtcDay(date);
  const windowEnd = options?.windowEnd ?? addUtcDays(dayStart, 1);
  const weekStart = addUtcDays(windowEnd, -7);
  const previousWeekStart = addUtcDays(windowEnd, -14);
  const previousWeekEnd = addUtcDays(windowEnd, -7);
  const monthStart = addUtcDays(windowEnd, -30);

  const [
    newUsers,
    totalUsers,
    totalAgents,
    runningAgents,
    dailyEvents,
    dauUsers,
    wauUsers,
    previousWauUsers,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: {
          gte: dayStart,
          lt: windowEnd,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          lt: windowEnd,
        },
      },
    }),
    prisma.agent.count({
      where: {
        createdAt: {
          lt: windowEnd,
        },
      },
    }),
    prisma.agent.count({
      where: {
        autoExecuteEnabled: true,
        createdAt: {
          lt: windowEnd,
        },
      },
    }),
    prisma.executionEvent.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lt: windowEnd,
        },
      },
      select: {
        status: true,
        errorMsg: true,
        metadata: true,
      },
    }),
    prisma.userEvent.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lt: windowEnd,
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userEvent.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lt: windowEnd,
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userEvent.findMany({
      where: {
        createdAt: {
          gte: previousWeekStart,
          lt: previousWeekEnd,
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const mauUsers = await prisma.userEvent.findMany({
    where: {
      createdAt: {
        gte: monthStart,
        lt: windowEnd,
      },
    },
    distinct: ["userId"],
    select: { userId: true },
  });

  const executions = dailyEvents.length;
  const successfulExecutions = dailyEvents.filter(
    (event) => event.status === "success"
  ).length;
  const failedExecutions = dailyEvents.filter(
    (event) => event.status === "failed"
  ).length;
  const txVolume = dailyEvents.reduce((sum, event) => {
    return (
      sum +
      numericMetadataValue(event.metadata, "amountXlm") +
      numericMetadataValue(event.metadata, "amount")
    );
  }, 0);
  const avgTxSize = executions > 0 ? txVolume / executions : 0;
  const successRate =
    executions > 0
      ? parseFloat(((successfulExecutions / executions) * 100).toFixed(1))
      : 0;

  const previousWauSet = new Set(previousWauUsers.map((user) => user.userId));
  const retainedUsers = wauUsers.filter((user) =>
    previousWauSet.has(user.userId)
  ).length;
  const retention7d =
    previousWauSet.size > 0
      ? parseFloat(((retainedUsers / previousWauSet.size) * 100).toFixed(1))
      : 0;

  const executionStatusMap = dailyEvents.reduce<Record<string, number>>(
    (acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    },
    {}
  );
  const failureReasonMap = dailyEvents.reduce<Record<string, number>>(
    (acc, event) => {
      if (event.status === "failed" && event.errorMsg) {
        acc[event.errorMsg] = (acc[event.errorMsg] || 0) + 1;
      }
      return acc;
    },
    {}
  );
  const transactionTypeMap = buildTransactionTypeBreakdown(dailyEvents);

  return {
    date: dayStart,
    dau: dauUsers.length,
    wau: wauUsers.length,
    mau: mauUsers.length,
    newUsers,
    totalUsers,
    totalAgents,
    runningAgents,
    executions,
    successfulExecutions,
    failedExecutions,
    txVolume: parseFloat(txVolume.toFixed(4)),
    avgTxSize: parseFloat(avgTxSize.toFixed(4)),
    successRate,
    retention7d,
    breakdowns: {
      executionStatus: Object.entries(executionStatusMap).map(
        ([status, count]) => ({
          status,
          count,
        })
      ),
      transactionType: Object.entries(transactionTypeMap).map(
        ([type, count]) => ({
          type,
          count,
        })
      ),
      failureReasons: Object.entries(failureReasonMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({
          reason,
          count,
        })),
    },
  };
}

export async function upsertDailyStats(
  prisma: PrismaClient,
  date: Date
): Promise<DailyHistoryPoint> {
  const snapshot = await buildDailySnapshot(prisma, date);

  const stored = await prisma.dailyStats.upsert({
    where: {
      date: snapshot.date,
    },
    update: {
      dau: snapshot.dau,
      wau: snapshot.wau,
      mau: snapshot.mau,
      newUsers: snapshot.newUsers,
      totalUsers: snapshot.totalUsers,
      totalAgents: snapshot.totalAgents,
      runningAgents: snapshot.runningAgents,
      executions: snapshot.executions,
      successfulExecutions: snapshot.successfulExecutions,
      failedExecutions: snapshot.failedExecutions,
      txVolume: snapshot.txVolume,
      avgTxSize: snapshot.avgTxSize,
      successRate: snapshot.successRate,
      retention7d: snapshot.retention7d,
      breakdowns: snapshot.breakdowns,
    },
    create: {
      date: snapshot.date,
      dau: snapshot.dau,
      wau: snapshot.wau,
      mau: snapshot.mau,
      newUsers: snapshot.newUsers,
      totalUsers: snapshot.totalUsers,
      totalAgents: snapshot.totalAgents,
      runningAgents: snapshot.runningAgents,
      executions: snapshot.executions,
      successfulExecutions: snapshot.successfulExecutions,
      failedExecutions: snapshot.failedExecutions,
      txVolume: snapshot.txVolume,
      avgTxSize: snapshot.avgTxSize,
      successRate: snapshot.successRate,
      retention7d: snapshot.retention7d,
      breakdowns: snapshot.breakdowns,
    },
  });

  return mapDailyStatsRow(stored);
}

export async function computePlatformMetrics(
  prisma: PrismaClient,
  options?: {
    now?: Date;
    period?: AnalyticsPeriod;
  }
): Promise<PlatformMetricsResponse> {
  const now = options?.now ?? new Date();
  const period = options?.period ?? "7d";
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const periodStart = addUtcDays(startOfUtcDay(now), -(toPeriodDays(period) - 1));

  const [
    totalUsers,
    walletConnectedUsers,
    successfulTransactions,
    totalAgents,
    runningAgents,
    totalExecutionAttempts,
    executionBreakdown,
    topStrategies,
    totalEventCount,
    allExecutionEvents,
    dauUsers,
    wauUsers,
    previousWauUsers,
    failureReasons,
    dailyHistoryRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userEvent.findMany({
      where: { eventName: "wallet_connected" },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.executionEvent.count({ where: { status: "success" } }),
    prisma.agent.count(),
    prisma.agent.count({
      where: {
        autoExecuteEnabled: true,
        nextExecutionAt: { gt: now },
      },
    }),
    prisma.executionEvent.count(),
    prisma.executionEvent.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.agent.groupBy({
      by: ["strategy"],
      _count: { strategy: true },
      orderBy: { _count: { strategy: "desc" } },
      take: 5,
    }),
    prisma.userEvent.count(),
    prisma.executionEvent.findMany({
      select: { metadata: true },
    }),
    prisma.userEvent.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userEvent.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userEvent.findMany({
      where: {
        createdAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo,
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.executionEvent.groupBy({
      by: ["errorMsg"],
      where: {
        status: "failed",
        errorMsg: { not: null },
      },
      _count: { errorMsg: true },
      orderBy: {
        _count: { errorMsg: "desc" },
      },
      take: 5,
    }),
    prisma.dailyStats.findMany({
      where: {
        date: {
          gte: periodStart,
        },
      },
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const usersWithWallet = walletConnectedUsers.length;
  const successRate =
    totalExecutionAttempts > 0
      ? parseFloat(((successfulTransactions / totalExecutionAttempts) * 100).toFixed(1))
      : 0;
  const dau = dauUsers.length;
  const wau = wauUsers.length;
  const previousWauSet = new Set(previousWauUsers.map((user) => user.userId));
  const retainedUsers = wauUsers.filter((user) =>
    previousWauSet.has(user.userId)
  ).length;
  const retention7d =
    previousWauSet.size > 0
      ? parseFloat(((retainedUsers / previousWauSet.size) * 100).toFixed(1))
      : 0;

  const transactionTypeBreakdown = buildTransactionTypeBreakdown(allExecutionEvents);
  const history = dailyHistoryRows.map(mapDailyStatsRow);
  const todayKey = toIsoDate(now);

  if (!history.some((item) => item.date === todayKey)) {
    const todaySnapshot = await buildDailySnapshot(prisma, now, { windowEnd: now });
    history.push({
      date: todayKey,
      dau: todaySnapshot.dau,
      wau: todaySnapshot.wau,
      mau: todaySnapshot.mau,
      newUsers: todaySnapshot.newUsers,
      totalUsers: todaySnapshot.totalUsers,
      totalAgents: todaySnapshot.totalAgents,
      runningAgents: todaySnapshot.runningAgents,
      executions: todaySnapshot.executions,
      successfulExecutions: todaySnapshot.successfulExecutions,
      failedExecutions: todaySnapshot.failedExecutions,
      txVolume: todaySnapshot.txVolume,
      avgTxSize: todaySnapshot.avgTxSize,
      successRate: todaySnapshot.successRate,
      retention7d: todaySnapshot.retention7d,
    });
  }

  return {
    period,
    metrics: {
      totalUsers,
      usersWithWallet,
      totalAgents,
      runningAgents,
      successfulTransactions,
      totalExecutionAttempts,
      successRate,
      totalEvents: totalEventCount,
      dau,
      wau,
      retention7d,
    },
    breakdowns: {
      executionStatus: executionBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      topStrategies: topStrategies.map((item) => ({
        strategy: item.strategy,
        count: item._count.strategy,
      })),
      transactionType: [
        { type: "agent_execution", count: transactionTypeBreakdown.agent_execution },
        { type: "manual_transfer", count: transactionTypeBreakdown.manual_transfer },
        { type: "manual_soroban", count: transactionTypeBreakdown.manual_soroban },
      ],
      failureReasons: failureReasons
        .filter((item) => item.errorMsg)
        .map((item) => ({
          reason: item.errorMsg as string,
          count: item._count.errorMsg,
        })),
    },
    history: history.sort((a, b) => a.date.localeCompare(b.date)),
    timestamp: new Date().toISOString(),
    isDemo: false,
  };
}
