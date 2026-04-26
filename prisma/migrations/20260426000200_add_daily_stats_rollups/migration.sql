-- Level 6 analytics rollups: daily persisted metrics for dashboard history

CREATE TABLE IF NOT EXISTS "DailyStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dau" INTEGER NOT NULL,
    "wau" INTEGER NOT NULL,
    "mau" INTEGER NOT NULL,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "runningAgents" INTEGER NOT NULL DEFAULT 0,
    "executions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "txVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTxSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakdowns" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyStats_date_key"
ON "DailyStats"("date");

CREATE INDEX IF NOT EXISTS "DailyStats_date_idx"
ON "DailyStats"("date");
