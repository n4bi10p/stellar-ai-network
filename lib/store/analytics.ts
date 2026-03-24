/**
 * Analytics Event Tracking
 * Emits user and execution events to UserEvent and ExecutionEvent tables
 */

import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/client";

/**
 * Save a user event (agent_created, transaction_executed, wallet_connected, etc.)
 */
export async function saveUserEvent(
  userId: string,
  eventName: string,
  eventData?: Record<string, unknown> | null
) {
  try {
    const prisma = getPrismaClient();
    return await prisma.userEvent.create({
      data: {
        userId,
        eventName,
        eventData: (eventData || null) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[Analytics] Error saving user event:", {
      userId,
      eventName,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't throw - analytics failures shouldn't break the application
  }
}

/**
 * Save an execution event (agent_executed with status, tx_hash, etc.)
 */
export async function saveExecutionEvent(
  userId: string,
  agentId: string,
  status: "pending" | "success" | "failed",
  txHash?: string,
  errorMsg?: string,
  metadata?: Record<string, unknown> | null
) {
  try {
    const prisma = getPrismaClient();
    return await prisma.executionEvent.create({
      data: {
        userId,
        agentId,
        status,
        txHash: txHash || null,
        errorMsg: errorMsg || null,
        metadata: (metadata || null) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[Analytics] Error saving execution event:", {
      userId,
      agentId,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't throw - analytics failures shouldn't break the application
  }
}

/**
 * Get user events for analytics dashboard
 */
export async function getUserEvents(
  userId: string,
  limit: number = 100,
  eventName?: string
) {
  try {
    const prisma = getPrismaClient();
    return await prisma.userEvent.findMany({
      where: {
        userId,
        ...(eventName && { eventName }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching user events:", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Get execution events for an agent
 */
export async function getExecutionEvents(
  agentId: string,
  limit: number = 100,
  status?: string
) {
  try {
    const prisma = getPrismaClient();
    return await prisma.executionEvent.findMany({
      where: {
        agentId,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching execution events:", {
      agentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Get execution statistics for user
 */
export async function getUserExecutionStats(userId: string) {
  try {
    const prisma = getPrismaClient();

    const totalExecutions = await prisma.executionEvent.count({
      where: { userId },
    });

    const successfulExecutions = await prisma.executionEvent.count({
      where: { userId, status: "success" },
    });

    const failedExecutions = await prisma.executionEvent.count({
      where: { userId, status: "failed" },
    });

    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: Math.round(successRate * 100) / 100,
    };
  } catch (err) {
    console.error("[Analytics] Error fetching execution stats:", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
    };
  }
}

/**
 * Get most common event types for user
 */
export async function getUserEventStats(userId: string, limit: number = 10) {
  try {
    const prisma = getPrismaClient();

    const events = await prisma.userEvent.groupBy({
      by: ["eventName"],
      where: { userId },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    return events.map((e) => ({
      eventName: e.eventName,
      count: e._count.id,
    }));
  } catch (err) {
    console.error("[Analytics] Error fetching event stats:", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
