import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrismaClient();

    // Mock data for local development when database is unreachable
    const mockData = {
      metrics: {
        totalUsers: 42,
        usersWithWallet: 35,
        totalAgents: 128,
        runningAgents: 87,
        successfulTransactions: 543,
        totalExecutionAttempts: 612,
        successRate: 88.7,
        totalEvents: 2156,
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
      },
      timestamp: new Date().toISOString(),
      isDemo: true,
    };

    // Try to fetch real database, fallback to mock if unreachable
    try {
      // 1. Total users signed up (count distinct users in User table)
      const totalUsers = await prisma.user.count();

      // 2. Users who connected wallet (count distinct users in UserEvent with 'wallet_connected' event)
      const walletConnectedUsers = await prisma.userEvent.findMany({
        where: { eventName: "wallet_connected" },
        distinct: ["userId"],
        select: { userId: true },
      });
      const usersWithWallet = walletConnectedUsers.length;

      // 3. Total transactions executed (count ExecutionEvent with status success)
      const successfulTransactions = await prisma.executionEvent.count({
        where: { status: "success" },
      });

      // 4. Total agents created (count distinct agents)
      const totalAgents = await prisma.agent.count();

      // 5. Agents currently running (agents with autoExecuteEnabled = true and nextExecutionAt in future)
      const now = new Date();
      const runningAgents = await prisma.agent.count({
        where: {
          autoExecuteEnabled: true,
          nextExecutionAt: {
            gt: now, // Next execution is in the future
          },
        },
      });

      // 6. Total execution events (all attempts, not just success)
      const totalExecutionAttempts = await prisma.executionEvent.count();

      // 7. Success rate across all transactions
      const successRate =
        totalExecutionAttempts > 0
          ? ((successfulTransactions / totalExecutionAttempts) * 100).toFixed(1)
          : "0.0";

      // 8. Execution breakdown by status
      const executionBreakdown = await prisma.executionEvent.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      });

      // 9. Top strategies used
      const topStrategies = await prisma.agent.groupBy({
        by: ["strategy"],
        _count: {
          strategy: true,
        },
        orderBy: {
          _count: {
            strategy: "desc",
          },
        },
        take: 5,
      });

      // 10. Total event count
      const totalEventCount = await prisma.userEvent.count();

      return NextResponse.json({
        metrics: {
          totalUsers,
          usersWithWallet,
          totalAgents,
          runningAgents,
          successfulTransactions,
          totalExecutionAttempts,
          successRate: parseFloat(successRate),
          totalEvents: totalEventCount,
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
        },
        timestamp: new Date().toISOString(),
      });
    } catch (dbError) {
      console.warn("[Analytics Metrics] Database unreachable, returning demo data:", dbError instanceof Error ? dbError.message : String(dbError));
      return NextResponse.json(mockData);
    }
  } catch (error) {
    console.error("[Analytics Metrics] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch analytics metrics",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
