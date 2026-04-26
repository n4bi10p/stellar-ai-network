import { NextRequest, NextResponse } from "next/server";
import { deleteCachedByPrefix } from "@/lib/cache/cache";
import { getPrismaClient } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid walletAddress" },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    console.log(`[Wallet Tracker] User lookup result:`, JSON.stringify(user));

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          displayName: `User ${walletAddress.slice(0, 8)}...`,
        },
      });
      console.log(`[Wallet Tracker] Created new user:`, JSON.stringify(user));
    }

    // Check if wallet_connected event already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingEvent = await prisma.userEvent.findFirst({
      where: {
        userId: user.id,
        eventName: "wallet_connected",
        createdAt: {
          gte: today,
        },
      },
    });

    if (!existingEvent) {
      // Track wallet connection event - use raw SQL to bypass Prisma type issues
      try {
        console.log(`[Wallet Tracker] Creating event for userId: ${user.id} (type: ${typeof user.id})`);
        
        // Use raw SQL instead of Prisma ORM
        await prisma.$executeRaw`
          INSERT INTO "UserEvent" ("id", "userId", "eventName", "createdAt")
          VALUES (gen_random_uuid(), ${user.id}::uuid, 'wallet_connected', now())
        `;
        
        console.log(`[Wallet Tracker] Tracked wallet connection for: ${walletAddress}`);
      } catch (createError) {
        console.error(`[Wallet Tracker] Create event error:`, createError);
        throw createError;
      }
    }

    deleteCachedByPrefix("analytics:metrics:");

    return NextResponse.json({
      success: true,
      userId: user.id,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error("[Wallet Tracker] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to track wallet connection",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
