/**
 * POST /api/sponsorship/accounts
 * Create a new sponsor account (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createSponsorAccount,
  listActiveSponsors,
} from "@/lib/store/sponsorship";

// POST - Create sponsor account
export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper auth check for admin users
    const { address, name, secretKey, monthlyBudget } = await request.json();

    if (!address || !name || !secretKey) {
      return NextResponse.json(
        { error: "Missing required fields: address, name, secretKey" },
        { status: 400 }
      );
    }

    const sponsor = await createSponsorAccount({
      address,
      name,
      secretKey,
      monthlyBudget,
    });

    return NextResponse.json(
      {
        id: sponsor.id,
        address: sponsor.address,
        name: sponsor.name,
        monthlyBudget: sponsor.monthlyBudget,
        active: sponsor.active,
        createdAt: sponsor.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sponsor account:", error);
    return NextResponse.json(
      { error: "Failed to create sponsor account" },
      { status: 500 }
    );
  }
}

// GET - List all active sponsors
export async function GET(request: NextRequest) {
  try {
    const sponsors = await listActiveSponsors();

    return NextResponse.json({
      sponsors: sponsors.map((s) => ({
        id: s.id,
        address: s.address,
        name: s.name,
        totalSpent: s.totalSpent,
        monthlyBudget: s.monthlyBudget,
        monthlySpent: s.monthlySpent,
        supportedAgents: s._count.agentSponsorships,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing sponsors:", error);
    return NextResponse.json(
      { error: "Failed to list sponsors" },
      { status: 500 }
    );
  }
}
