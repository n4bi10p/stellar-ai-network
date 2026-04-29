/**
 * POST /api/sponsorship/agents/[id]/enable
 * Enable fee sponsorship for an agent
 */
import { NextRequest, NextResponse } from "next/server";
import {
  enableAgentSponsorship,
  getAgentSponsorshipConfig,
} from "@/lib/store/sponsorship";
import { getAgentById } from "@/lib/store/agents";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;

  try {
    const { sponsorId, maxPerTransaction } = await request.json();

    if (!sponsorId) {
      return NextResponse.json(
        { error: "sponsorId is required" },
        { status: 400 }
      );
    }

    // Verify agent exists
    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Enable sponsorship
    const sponsorship = await enableAgentSponsorship({
      agentId,
      sponsorId,
      maxPerTransaction,
    });

    return NextResponse.json({
      success: true,
      sponsorship: {
        agentId: sponsorship.agentId,
        sponsorId: sponsorship.sponsorId,
        enabled: sponsorship.enabled,
        maxPerTransaction: sponsorship.maxPerTransaction,
      },
    });
  } catch (error) {
    console.error("Error enabling agent sponsorship:", error);
    return NextResponse.json(
      { error: "Failed to enable sponsorship" },
      { status: 500 }
    );
  }
}
