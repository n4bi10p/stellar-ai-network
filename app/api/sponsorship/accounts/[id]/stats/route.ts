/**
 * GET /api/sponsorship/accounts/[id]/stats
 * Get sponsorship statistics for a sponsor account
 */
import { NextRequest, NextResponse } from "next/server";
import { getSponsorshipStats } from "@/lib/store/sponsorship";
import { getPrismaClient } from "@/lib/db/client";

const db = getPrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sponsorId } = await params;

  try {
    // Verify sponsor exists
    const sponsor = await db.sponsorAccount.findUnique({
      where: { id: sponsorId },
    });

    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor not found" },
        { status: 404 }
      );
    }

    // Get sponsorship stats
    const stats = await getSponsorshipStats(sponsorId);

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error("Error getting sponsorship stats:", error);
    return NextResponse.json(
      { error: "Failed to get sponsorship stats" },
      { status: 500 }
    );
  }
}
