// ── Agent Governance Audit Log ──
// Writes structured audit events to AgentAuditLog table (with console fallback).

import { getPrismaClient } from "@/lib/db/client";

export type AuditAction =
  | "paused"
  | "resumed"
  | "spend_limit_blocked"
  | "execution_approved"
  | "governance_updated"
  | "dry_run_executed"
  | "config_changed";

export interface AuditLogEntry {
  id: string;
  agentId: string;
  owner: string;
  action: AuditAction;
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * Write one audit event.
 * Always emits a structured JSON line to stdout (captured by Vercel Logs).
 * Also persists to AgentAuditLog table when Prisma is available.
 */
export async function writeAuditLog(entry: {
  agentId: string;
  owner: string;
  action: AuditAction;
  details?: Record<string, unknown>;
}): Promise<void> {
  const details = entry.details ?? {};

  // Structured log line — always emitted
  console.log(
    JSON.stringify({
      type: "audit",
      agentId: entry.agentId,
      owner: entry.owner,
      action: entry.action,
      details,
      timestamp: new Date().toISOString(),
    })
  );

  try {
    const prisma = getPrismaClient();
    await prisma.$executeRaw`
      INSERT INTO "AgentAuditLog" ("id", "agentId", "owner", "action", "details", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${entry.agentId},
        ${entry.owner},
        ${entry.action},
        ${JSON.stringify(details)}::jsonb,
        now()
      )
    `;
  } catch {
    // Prisma unavailable — structured log above is the fallback
  }
}

/**
 * Retrieve the most recent 50 audit entries for an agent.
 */
export async function getAuditLog(agentId: string): Promise<AuditLogEntry[]> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        agentId: string;
        owner: string;
        action: string;
        details: unknown;
        createdAt: Date;
      }>
    >`
      SELECT "id", "agentId", "owner", "action", "details", "createdAt"
      FROM "AgentAuditLog"
      WHERE "agentId" = ${agentId}
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      owner: r.owner,
      action: r.action as AuditAction,
      details:
        r.details !== null && typeof r.details === "object" && !Array.isArray(r.details)
          ? (r.details as Record<string, unknown>)
          : {},
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
