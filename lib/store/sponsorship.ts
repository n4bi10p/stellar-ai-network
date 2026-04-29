/**
 * Database helpers for fee sponsorship feature
 * Manages sponsor accounts, agent sponsorships, and transaction tracking
 */

import { getPrismaClient } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type { SponsorshipConfig } from "@/lib/stellar/fee-sponsorship";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";

const db = getPrismaClient();

/**
 * Create a new sponsor account
 */
export async function createSponsorAccount(params: {
  address: string;
  name: string;
  secretKey: string;
  monthlyBudget?: number;
}) {
  // Encrypt the secret key before storing
  const encryptedBlob = encryptSecret(params.secretKey);

  return db.sponsorAccount.create({
    data: {
      address: params.address,
      name: params.name,
      secretKeyEncrypted: encryptedBlob,
      monthlyBudget: params.monthlyBudget ?? 100,
    },
  });
}

/**
 * Get sponsor account with decrypted secret key
 * WARNING: Only call this in secure contexts (server-side, after auth check)
 */
export async function getSponsorAccountWithSecret(sponsorId: string): Promise<{
  id: string;
  address: string;
  name: string;
  secretKey: string;
  totalSpent: number;
  monthlyBudget: number;
  monthlySpent: number;
  monthResetAt: Date;
  active: boolean;
} | null> {
  const sponsor = await db.sponsorAccount.findUnique({
    where: { id: sponsorId },
  });

  if (!sponsor) return null;

  try {
    // Prisma automatically deserializes JSON, so secretKeyEncrypted is already the blob object
    const decryptedKey = decryptSecret(sponsor.secretKeyEncrypted as any);
    return {
      id: sponsor.id,
      address: sponsor.address,
      name: sponsor.name,
      secretKey: decryptedKey,
      totalSpent: sponsor.totalSpent,
      monthlyBudget: sponsor.monthlyBudget,
      monthlySpent: sponsor.monthlySpent,
      monthResetAt: sponsor.monthResetAt,
      active: sponsor.active,
    };
  } catch (error) {
    console.error("Failed to decrypt sponsor secret key:", error);
    return null;
  }
}

/**
 * Enable sponsorship for an agent
 */
export async function enableAgentSponsorship(params: {
  agentId: string;
  sponsorId: string;
  maxPerTransaction?: number;
}) {
  // Check if sponsorship already exists
  const existing = await db.agentSponsorship.findUnique({
    where: { agentId: params.agentId },
  });

  if (existing) {
    // Update existing
    return db.agentSponsorship.update({
      where: { agentId: params.agentId },
      data: {
        enabled: true,
        maxPerTransaction: params.maxPerTransaction ?? 10,
      },
    });
  }

  // Create new
  return db.agentSponsorship.create({
    data: {
      agentId: params.agentId,
      sponsorId: params.sponsorId,
      enabled: true,
      maxPerTransaction: params.maxPerTransaction ?? 10,
    },
  });
}

/**
 * Disable sponsorship for an agent
 */
export async function disableAgentSponsorship(agentId: string) {
  return db.agentSponsorship.update({
    where: { agentId },
    data: { enabled: false },
  });
}

/**
 * Get sponsorship config for an agent
 */
export async function getAgentSponsorshipConfig(agentId: string): Promise<SponsorshipConfig | null> {
  const sponsorship = await db.agentSponsorship.findUnique({
    where: { agentId },
    include: { sponsor: true },
  });

  if (!sponsorship || !sponsorship.sponsor.active) {
    return null;
  }

  // Check if monthly reset is needed
  const now = new Date();
  let monthlySpent = sponsorship.sponsor.monthlySpent;
  let monthResetAt = sponsorship.sponsor.monthResetAt;

  // If a month has passed, reset the monthly spend
  if (now > monthResetAt) {
    const nextMonth = new Date(monthResetAt);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await db.sponsorAccount.update({
      where: { id: sponsorship.sponsorId },
      data: {
        monthlySpent: 0,
        monthResetAt: nextMonth,
      },
    });

    monthlySpent = 0;
    monthResetAt = nextMonth;
  }

  return {
    enabled: sponsorship.enabled,
    sponsorAddress: sponsorship.sponsor.address,
    maxSpendPerTransaction: sponsorship.maxPerTransaction,
    maxMonthlySpend: sponsorship.sponsor.monthlyBudget,
    monthlySpendUsed: monthlySpent,
    lastResetAt: monthResetAt,
  };
}

/**
 * Record a sponsored transaction
 */
export async function recordSponsoredTransaction(params: {
  txHash: string;
  agentId: string;
  sponsorId: string;
  feePaid: number; // in stroops, will be converted to XLM
  baseFee: number; // in stroops
  originalXdr?: string;
  feeBumpXdr?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const feePaidXlm = params.feePaid / 10_000_000;
  const baseFeeXlm = params.baseFee / 10_000_000;

  // Create transaction record
  const txRecord = await db.sponsoredTransaction.create({
    data: {
      txHash: params.txHash,
      agentId: params.agentId,
      sponsorId: params.sponsorId,
      status: "pending",
      feePaid: feePaidXlm,
      baseFee: baseFeeXlm,
      originalXdr: params.originalXdr,
      feeBumpXdr: params.feeBumpXdr,
      metadata: params.metadata,
    },
  });

  // Update sponsor account's spent amounts
  await db.sponsorAccount.update({
    where: { id: params.sponsorId },
    data: {
      totalSpent: { increment: feePaidXlm },
      monthlySpent: { increment: feePaidXlm },
    },
  });

  // Update agent sponsorship stats
  await db.agentSponsorship.update({
    where: { agentId: params.agentId },
    data: {
      transactionCount: { increment: 1 },
      totalSponsored: { increment: feePaidXlm },
    },
  });

  return txRecord;
}

/**
 * Update sponsored transaction status
 */
export async function updateSponsoredTransactionStatus(
  txHash: string,
  status: "pending" | "success" | "failed" | "reverted"
) {
  return db.sponsoredTransaction.update({
    where: { txHash },
    data: {
      status,
      confirmedAt: ["success", "failed", "reverted"].includes(status)
        ? new Date()
        : undefined,
    },
  });
}

/**
 * Get sponsorship statistics for a sponsor account
 */
export async function getSponsorshipStats(sponsorId: string) {
  const sponsor = await db.sponsorAccount.findUnique({
    where: { id: sponsorId },
    include: {
      sponsoredTxs: {
        where: { status: "success" },
      },
      agentSponsorships: true,
    },
  });

  if (!sponsor) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const successfulThisMonth = sponsor.sponsoredTxs
    .filter((tx) => tx.createdAt >= monthStart)
    .reduce((sum, tx) => sum + tx.feePaid, 0);

  return {
    id: sponsor.id,
    address: sponsor.address,
    name: sponsor.name,
    active: sponsor.active,
    totalSpent: sponsor.totalSpent,
    monthlyBudget: sponsor.monthlyBudget,
    monthlySpent: sponsor.monthlySpent,
    successfulThisMonth,
    remainingMonthlyBudget: Math.max(
      0,
      sponsor.monthlyBudget - sponsor.monthlySpent
    ),
    supportedAgents: sponsor.agentSponsorships.length,
    totalTransactions: sponsor.sponsoredTxs.length,
    percentageUsed: (sponsor.monthlySpent / sponsor.monthlyBudget) * 100,
  };
}

/**
 * List all active sponsors
 */
export async function listActiveSponsors() {
  return db.sponsorAccount.findMany({
    where: { active: true },
    select: {
      id: true,
      address: true,
      name: true,
      totalSpent: true,
      monthlyBudget: true,
      monthlySpent: true,
      createdAt: true,
      _count: {
        select: { agentSponsorships: true },
      },
    },
  });
}

/**
 * Get sponsorship audit trail for an agent
 */
export async function getAgentSponsorshipAudit(
  agentId: string,
  limit: number = 50
) {
  return db.sponsoredTransaction.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sponsor: {
        select: {
          id: true,
          address: true,
          name: true,
        },
      },
    },
  });
}
