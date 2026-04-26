-- Level 6 foundation: analytics integrity + durable scheduler state

-- Manual transactions do not always map to an Agent row.
ALTER TABLE "ExecutionEvent" ALTER COLUMN "agentId" DROP NOT NULL;
ALTER TABLE "ExecutionEvent" DROP CONSTRAINT IF EXISTS "ExecutionEvent_agentId_fkey";

-- Durable due-event windows for cron fan-out across stateless workers.
CREATE TABLE IF NOT EXISTS "SchedulerDueWindow" (
    "window" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerDueWindow_pkey" PRIMARY KEY ("window")
);

-- Durable idempotency keys for notification and execution dispatch.
CREATE TABLE IF NOT EXISTS "SchedulerIdempotency" (
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerIdempotency_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "SchedulerDueWindow_expiresAt_idx"
ON "SchedulerDueWindow"("expiresAt");

CREATE INDEX IF NOT EXISTS "SchedulerIdempotency_expiresAt_idx"
ON "SchedulerIdempotency"("expiresAt");
