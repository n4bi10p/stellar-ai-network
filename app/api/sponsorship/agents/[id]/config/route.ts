/**
 * GET /api/sponsorship/agents/[id]/config
 * Get fee sponsorship configuration for an agent
 */
import { NextRequest, NextResponse } from "next/server";
import { getAgentSponsorshipConfig, getAgentSponsorshipAudit } from "@/lib/store/sponsorship";
import { getAgentById } from "@/lib/store/agents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const auditLimit = request.nextUrl.searchParams.get("auditLimit") || "10";

  try {
    // Verify agent exists
    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get sponsorship config
    const config = await getAgentSponsorshipConfig(agentId);

    // Get recent sponsorship transactions
    const audit = await getAgentSponsorshipAudit(agentId, parseInt(auditLimit));

    return NextResponse.json({
      config: config ? {
        enabled: config.enabled,
        sponsorAddress: config.sponsorAddress,
        maxSpendPerTransaction: config.maxSpendPerTransaction,
        maxMonthlySpend: config.maxMonthlySpend,
        monthlySpendUsed: config.monthlySpendUsed,
        lastResetAt: config.lastResetAt,
      } : null,
      recentTransactions: audit.map((tx) => ({
        txHash: tx.txHash,
        status: tx.status,
        feePaid: tx.feePaid,
        baseFee: tx.baseFee,
        createdAt: tx.createdAt,
        confirmedAt: tx.confirmedAt,
        sponsor: tx.sponsor,
      })),
    });
  } catch (error) {
    console.error("Error getting agent sponsorship config:", error);
    return NextResponse.json(
      { error: "Failed to get sponsorship config" },
      { status: 500 }
    );
  }
}
