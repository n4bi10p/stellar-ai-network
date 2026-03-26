import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const owner = request.nextUrl.searchParams.get("owner");
    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner query param" },
        { status: 400 }
      );
    }

    console.log("[execution-summary] Fetching for owner:", owner?.slice(0, 8));

    // Get user by wallet address
    const userResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "walletAddress" = ${owner} LIMIT 1
    `;

    if (!userResult || userResult.length === 0) {
      console.log("[execution-summary] User not found for", owner?.slice(0, 8));
      return NextResponse.json({
        summary: { total: 0, successful: 0, failed: 0, successRate: 0 },
        recent: [],
      });
    }

    const userId = userResult[0].id;

    // Fetch all execution events for this user, ordered by date
    const events = await prisma.executionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        agentId: true,
        status: true,
        txHash: true,
        metadata: true,
        createdAt: true,
      },
    });

    console.log("[execution-summary] Found", events.length, "execution events");

    // Map to recent format
    const recent = events.slice(0, 8).map((event) => {
      const metadata = event.metadata as any;
      const isManual = event.agentId?.startsWith("manual_");
      return {
        id: event.id,
        agentId: event.agentId,
        agentName: isManual ? `Manual Transfer` : event.agentId,
        contractId: null,
        triggerSource: metadata?.transactionType || (isManual ? "manual_transfer" : "agent_execution"),
        success: event.status === "success",
        txHash: event.txHash,
        createdAt: event.createdAt,
      };
    });

    const successful = events.filter((e) => e.status === "success").length;
    const failed = events.filter((e) => e.status === "failed").length;

    return NextResponse.json({
      summary: {
        total: events.length,
        successful,
        failed,
        successRate:
          events.length === 0 ? 0 : Math.round((successful / events.length) * 100),
      },
      recent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to summarize executions";
    console.error("[execution-summary] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
