-- Level 6: Governance audit trail
CREATE TABLE IF NOT EXISTS "AgentAuditLog" (
  "id"        TEXT NOT NULL,
  "agentId"   TEXT NOT NULL,
  "owner"     TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "details"   JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentAuditLog_agentId_createdAt_idx" ON "AgentAuditLog"("agentId", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentAuditLog_owner_createdAt_idx"   ON "AgentAuditLog"("owner", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentAuditLog_action_createdAt_idx"  ON "AgentAuditLog"("action", "createdAt");
