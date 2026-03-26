// GET /api/execution-activity — Get all execution activity (transactions, agent executions, etc.)
// Fetches ExecutionEvent records with filtering options

import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const owner = request.nextUrl.searchParams.get("owner");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 500);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const status = request.nextUrl.searchParams.get("status"); // 'success', 'failed', 'pending'

    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner query param" },
        { status: 400 }
      );
    }

    // Get user ID from wallet address
    const userResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "walletAddress" = ${owner} LIMIT 1
    `;

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({
        activities: [],
        total: 0,
        summary: {
          totalTransactions: 0,
          successful: 0,
          failed: 0,
          pending: 0,
          byType: {
            agent_execution: 0,
            manual_transfer: 0,
            manual_soroban: 0,
          },
        },
      });
    }

    const userId = userResult[0].id;

    // Build where clause for filtering
    const whereClause = {
      userId,
      ...(status && { status }),
    };

    // Get all activities
    const activities = await prisma.executionEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        agentId: true,
        status: true,
        txHash: true,
        errorMsg: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Get total count
    const totalCount = await prisma.executionEvent.count({
      where: whereClause,
    });

    // Get summary stats
    const executionStats = await prisma.executionEvent.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    });

    // Decode metadata and add transaction type
    const enrichedActivities = activities.map((activity) => {
      const metadata = activity.metadata as any;
      const transactionType = metadata?.transactionType || "unknown";
      return {
        ...activity,
        transactionType,
        timestamp: activity.createdAt,
      };
    });

    // Count by type
    const byTypeMap = enrichedActivities.reduce(
      (acc: any, activity) => {
        acc[activity.transactionType] = (acc[activity.transactionType] || 0) + 1;
        return acc;
      },
      { agent_execution: 0, manual_transfer: 0, manual_soroban: 0 }
    );

    const successCount = executionStats.find((s) => s.status === "success")?._count.status || 0;
    const failedCount = executionStats.find((s) => s.status === "failed")?._count.status || 0;
    const pendingCount = executionStats.find((s) => s.status === "pending")?._count.status || 0;

    return NextResponse.json({
      activities: enrichedActivities,
      total: totalCount,
      limit,
      offset,
      summary: {
        totalTransactions: totalCount,
        successful: successCount,
        failed: failedCount,
        pending: pendingCount,
        byType: byTypeMap,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch execution activity";
    console.error("[API execution-activity] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
