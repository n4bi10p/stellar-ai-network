/**
 * Analytics Event Tracking
 * Emits user and execution events to UserEvent and ExecutionEvent tables
 */

import type { Prisma } from "@prisma/client";
import { getPrismaClient, withRetry } from "@/lib/db/client";

/**
 * Save a user event (agent_created, transaction_executed, wallet_connected, etc.)
 */
export async function saveUserEvent(
  userIdOrWalletAddress: string,
  eventName: string,
  eventData?: Record<string, unknown> | null
) {
  try {
    const prisma = getPrismaClient();
    
    // If userIdOrWalletAddress looks like a UUID (36 chars with hyphens), use directly
    // Otherwise, treat as wallet address and look up or create the user
    let userId = userIdOrWalletAddress;
    if (!userIdOrWalletAddress.includes("-") || userIdOrWalletAddress.length !== 36) {
      // It's a wallet address, look up or create the user UUID
      let result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE "walletAddress" = ${userIdOrWalletAddress} LIMIT 1
      `;
      if (!result || result.length === 0) {
        // User doesn't exist - create one
        try {
          const createResult = await prisma.$queryRaw<Array<{ id: string }>>`
            INSERT INTO "User" ("id", "walletAddress", "createdAt") 
            VALUES (gen_random_uuid(), ${userIdOrWalletAddress}, now())
            RETURNING "id"
          `;
          if (createResult && createResult.length > 0) {
            userId = createResult[0].id;
          } else {
            console.warn("[Analytics] Failed to create user for wallet:", userIdOrWalletAddress);
            return;
          }
        } catch (createErr: unknown) {
          // User might have been created by another process, try to fetch again
          const retryResult = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "User" WHERE "walletAddress" = ${userIdOrWalletAddress} LIMIT 1
          `;
          if (!retryResult || retryResult.length === 0) {
            console.warn("[Analytics] User creation conflict for wallet:", userIdOrWalletAddress);
            return;
          }
          userId = retryResult[0].id;
        }
      } else {
        userId = result[0].id;
      }
    }
    
    // Use raw SQL with explicit UUID casting to avoid Prisma ORM type issues
    const eventDataJson = eventData ? JSON.stringify(eventData) : null;
    await prisma.$executeRaw`
      INSERT INTO "UserEvent" ("id", "userId", "eventName", "eventData", "createdAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${eventName}, ${eventDataJson}::jsonb, now())
    `;
    
    console.log(`[Analytics] User event saved: ${eventName} for ${userIdOrWalletAddress}`);
    return { userId, eventName, eventData };
  } catch (err) {
    console.error("[Analytics] Error saving user event:", {
      userIdOrWalletAddress,
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
  userIdOrWalletAddress: string,
  agentId: string,
  status: "pending" | "success" | "failed",
  txHash?: string,
  errorMsg?: string,
  metadata?: Record<string, unknown> | null
) {
  try {
    console.log(`[Analytics] saveExecutionEvent called:`, { userIdOrWalletAddress, agentId, status, txHash });
    const prisma = getPrismaClient();
    
    // If userIdOrWalletAddress looks like a UUID (36 chars with hyphens), use directly
    // Otherwise, treat as wallet address and look up or create the user
    let userId = userIdOrWalletAddress;
    if (!userIdOrWalletAddress.includes("-") || userIdOrWalletAddress.length !== 36) {
      // It's a wallet address, look up or create the user UUID
      console.log(`[Analytics] Looking up user by wallet:`, userIdOrWalletAddress);
      let result = await withRetry(
        () => prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "User" WHERE "walletAddress" = ${userIdOrWalletAddress} LIMIT 1
        `,
        2, // maxRetries
        50 // delayMs
      );
      if (!result || result.length === 0) {
        console.log(`[Analytics] User not found, creating new user for wallet:`, userIdOrWalletAddress);
        // User doesn't exist - create one
        try {
          const createResult = await withRetry(
            () => prisma.$queryRaw<Array<{ id: string }>>`
              INSERT INTO "User" ("id", "walletAddress", "createdAt") 
              VALUES (gen_random_uuid(), ${userIdOrWalletAddress}, now())
              RETURNING "id"
            `,
            2,
            50
          );
          if (createResult && createResult.length > 0) {
            userId = createResult[0].id;
            console.log(`[Analytics] User created:`, userId);
          } else {
            console.warn("[Analytics] Failed to create user for wallet:", userIdOrWalletAddress);
            return;
          }
        } catch (createErr: unknown) {
          console.log(`[Analytics] User creation conflict (likely created by another process), retrying...`);
          // User might have been created by another process, try to fetch again
          const retryResult = await withRetry(
            () => prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM "User" WHERE "walletAddress" = ${userIdOrWalletAddress} LIMIT 1
            `,
            2,
            50
          );
          if (!retryResult || retryResult.length === 0) {
            console.warn("[Analytics] User creation conflict for wallet:", userIdOrWalletAddress);
            return;
          }
          userId = retryResult[0].id;
          console.log(`[Analytics] User fetched after retry:`, userId);
        }
      } else {
        userId = result[0].id;
        console.log(`[Analytics] User found:`, userId);
      }
    }
    
    // Use raw SQL with explicit UUID casting to avoid Prisma ORM type issues
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    console.log(`[Analytics] Inserting ExecutionEvent for userId:`, userId);
    
    // Use retry logic for resilience against transient connection failures
    await withRetry(
      () => prisma.$executeRaw`
        INSERT INTO "ExecutionEvent" ("id", "userId", "agentId", "status", "txHash", "errorMsg", "metadata", "createdAt")
        VALUES (gen_random_uuid(), ${userId}::uuid, ${agentId}, ${status}, ${txHash || null}, ${errorMsg || null}, ${metadataJson}::jsonb, now())
      `,
      3, // maxRetries
      100 // delayMs
    );
    
    console.log(`[Analytics] Execution event saved: ${status} for agent ${agentId}`);
    return { userId, agentId, status, txHash, errorMsg, metadata };
  } catch (err) {
    console.error("[Analytics] Error saving execution event:", {
      userIdOrWalletAddress,
      agentId,
      status,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
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
