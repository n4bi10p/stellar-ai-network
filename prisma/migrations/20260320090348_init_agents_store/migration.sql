-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" TEXT,
    "strategyConfig" JSONB,
    "strategyState" JSONB,
    "autoExecuteEnabled" BOOLEAN DEFAULT false,
    "executionMode" TEXT,
    "reminders" JSONB,
    "lastExecutionAt" TIMESTAMP(3),
    "nextExecutionAt" TIMESTAMP(3),
    "executionCount" INTEGER,
    "fullAuto" JSONB,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "executionMode" TEXT,
    "success" BOOLEAN NOT NULL,
    "txHash" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "owner" TEXT,
    "type" TEXT NOT NULL,
    "score" INTEGER,
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateUsage" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "templateId" TEXT NOT NULL,
    "owner" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_owner_createdAt_idx" ON "Agent"("owner", "createdAt");

-- CreateIndex
CREATE INDEX "Agent_strategy_idx" ON "Agent"("strategy");

-- CreateIndex
CREATE INDEX "Agent_contractId_idx" ON "Agent"("contractId");

-- CreateIndex
CREATE INDEX "ExecutionLog_agentId_createdAt_idx" ON "ExecutionLog"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionLog_success_createdAt_idx" ON "ExecutionLog"("success", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackEvent_agentId_createdAt_idx" ON "FeedbackEvent"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackEvent_type_createdAt_idx" ON "FeedbackEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "TemplateUsage_templateId_createdAt_idx" ON "TemplateUsage"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "TemplateUsage_owner_createdAt_idx" ON "TemplateUsage"("owner", "createdAt");

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEvent" ADD CONSTRAINT "FeedbackEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateUsage" ADD CONSTRAINT "TemplateUsage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
