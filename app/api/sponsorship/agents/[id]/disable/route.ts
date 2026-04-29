/**
 * POST /api/sponsorship/agents/[id]/disable
 * Disable fee sponsorship for an agent
 */
import { NextRequest, NextResponse } from "next/server";
import { disableAgentSponsorship } from "@/lib/store/sponsorship";
import { getAgentById } from "@/lib/store/agents";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;

  try {
    // Verify agent exists
    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Disable sponsorship
    const sponsorship = await disableAgentSponsorship(agentId);

    return NextResponse.json({
      success: true,
      sponsorship: {
        agentId: sponsorship.agentId,
        enabled: sponsorship.enabled,
      },
    });
  } catch (error) {
    console.error("Error disabling agent sponsorship:", error);
    return NextResponse.json(
      { error: "Failed to disable sponsorship" },
      { status: 500 }
    );
  }
}
