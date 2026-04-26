-- Level 6 Advanced: Multi-Agent Workflow Orchestrator tables
CREATE TABLE IF NOT EXISTS "AgentWorkflow" (
  "id"          TEXT NOT NULL,
  "owner"       TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "steps"       JSONB NOT NULL DEFAULT '[]',
  "status"      TEXT NOT NULL DEFAULT 'active',
  "runCount"    INTEGER NOT NULL DEFAULT 0,
  "lastRunAt"   TIMESTAMP(3),
  "nextRunAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentWorkflowRun" (
  "id"             TEXT NOT NULL,
  "workflowId"     TEXT NOT NULL,
  "status"         TEXT NOT NULL,
  "triggerSource"  TEXT NOT NULL,
  "steps"          JSONB NOT NULL DEFAULT '[]',
  "totalSteps"     INTEGER NOT NULL DEFAULT 0,
  "completedSteps" INTEGER NOT NULL DEFAULT 0,
  "failedSteps"    INTEGER NOT NULL DEFAULT 0,
  "skippedSteps"   INTEGER NOT NULL DEFAULT 0,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"    TIMESTAMP(3),
  CONSTRAINT "AgentWorkflowRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentWorkflowRun_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "AgentWorkflow"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AgentWorkflow_owner_createdAt_idx"       ON "AgentWorkflow"("owner", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentWorkflow_status_nextRunAt_idx"       ON "AgentWorkflow"("status", "nextRunAt");
CREATE INDEX IF NOT EXISTS "AgentWorkflowRun_workflowId_startedAt_idx" ON "AgentWorkflowRun"("workflowId", "startedAt");
CREATE INDEX IF NOT EXISTS "AgentWorkflowRun_status_startedAt_idx"    ON "AgentWorkflowRun"("status", "startedAt");
