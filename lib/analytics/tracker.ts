// ── Analytics Event Tracker ──
// Central system for tracking user events & agent executions

import { getPrismaClient } from "@/lib/db/client";

export type EventName =
  | "user_signin"
  | "wallet_connected"
  | "agent_created"
  | "agent_deployed"
  | "agent_executed"
  | "transaction_submitted"
  | "transaction_confirmed"
  | "transaction_failed"
  | "execution_mode_changed"
  | "reminder_sent"
  | "error_encountered"
  | "page_viewed";

interface EventData {
  [key: string]: string | number | boolean | undefined | object;
}

/**
 * Track a user event for analytics
 * Creates/links user if needed via wallet address
 */
export async function trackUserEvent(
  walletAddress: string,
  eventName: EventName,
  eventData?: EventData
): Promise<void> {
  try {
    const prisma = getPrismaClient();

    // Get or create user by wallet address
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          displayName: `User_${walletAddress.substring(0, 6)}`,
        },
      });
    }

    // Update last signin if it's a signin event
    if (eventName === "user_signin") {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSigninAt: new Date() },
      });
    }

    // Record the event
    await prisma.userEvent.create({
      data: {
        userId: user.id,
        eventName,
        eventData: eventData || undefined,
      },
    });
  } catch (error) {
    console.error(`Failed to track event ${eventName}:`, error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Track an execution event with detailed status
 */
export async function trackExecutionEvent(
  walletAddress: string,
  agentId: string,
  status: "pending" | "success" | "failed",
  metadata?: {
    txHash?: string;
    errorMsg?: string;
    successRate?: number;
    [key: string]: any;
  }
): Promise<void> {
  try {
    const prisma = getPrismaClient();

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          displayName: `User_${walletAddress.substring(0, 6)}`,
        },
      });
    }

    // Record execution event
    await prisma.executionEvent.create({
      data: {
        userId: user.id,
        agentId,
        status,
        txHash: metadata?.txHash,
        errorMsg: metadata?.errorMsg,
        successRate: metadata?.successRate,
        metadata: metadata || undefined,
      },
    });

    // Also create a generic user event for easy dashboarding
    await prisma.userEvent.create({
      data: {
        userId: user.id,
        eventName:
          status === "success" ? "transaction_confirmed" : "transaction_failed",
        eventData: {
          agentId,
          txHash: metadata?.txHash,
          errorMsg: metadata?.errorMsg,
        },
      },
    });
  } catch (error) {
    console.error("Failed to track execution event:", error);
  }
}

/**
 * Get analytics for a specific user
 */
export async function getUserAnalytics(userId: string) {
  try {
    const prisma = getPrismaClient();

    const [eventCounts, executionStats, recentEvents] = await Promise.all([
      // Event counts by type
      prisma.userEvent.groupBy({
        by: ["eventName"],
        where: { userId },
        _count: true,
      }),

      // Execution stats
      prisma.executionEvent.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),

      // Recent events (last 30 days)
      prisma.userEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return {
      eventCounts: Object.fromEntries(
        eventCounts.map((e) => [e.eventName, e._count])
      ),
      executionStats: Object.fromEntries(
        executionStats.map((e) => [e.status, e._count])
      ),
      recentEvents,
    };
  } catch (error) {
    console.error("Failed to get user analytics:", error);
    return null;
  }
}

/**
 * Get platform-wide analytics
 */
export async function getPlatformAnalytics() {
  try {
    const prisma = getPrismaClient();

    const [totalUsers, totalAgents, executionStats, eventStats] = await Promise.all([
      // Total unique users
      prisma.user.count(),

      // Total agents created
      prisma.agent.count(),

      // Execution success/fail ratio
      prisma.executionEvent.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Most common events
      prisma.userEvent.groupBy({
        by: ["eventName"],
        _count: true,
        orderBy: { _count: { eventName: "desc" } },
      }),
    ]);

    const successRate =
      executionStats.length > 0
        ? Math.round(
            (executionStats.find((e) => e.status === "success")?._count ?? 0) /
              executionStats.reduce((sum, e) => sum + e._count, 0) *
              100
          )
        : 0;

    return {
      totalUsers,
      totalAgents,
      executionStats: Object.fromEntries(
        executionStats.map((e) => [e.status, e._count])
      ),
      successRate,
      topEvents: eventStats.slice(0, 5).map((e) => ({
        event: e.eventName,
        count: e._count,
      })),
    };
  } catch (error) {
    console.error("Failed to get platform analytics:", error);
    return null;
  }
}
