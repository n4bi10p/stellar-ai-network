-- Add userId column and foreign key to Agent table
ALTER TABLE "Agent" ADD COLUMN "userId" UUID;

-- CreateTable User
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSigninAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserEvent
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExecutionEvent
CREATE TABLE "ExecutionEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "successRate" DOUBLE PRECISION,
    "errorMsg" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_userId_eventName_createdAt_idx" ON "UserEvent"("userId", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_eventName_createdAt_idx" ON "UserEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ExecutionEvent_userId_createdAt_idx" ON "ExecutionEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionEvent_agentId_createdAt_idx" ON "ExecutionEvent"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionEvent_status_createdAt_idx" ON "ExecutionEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionEvent_createdAt_idx" ON "ExecutionEvent"("createdAt");

-- AddForeignKey for Agent.userId
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for UserEvent.userId
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ExecutionEvent.userId
ALTER TABLE "ExecutionEvent" ADD CONSTRAINT "ExecutionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ExecutionEvent.agentId
ALTER TABLE "ExecutionEvent" ADD CONSTRAINT "ExecutionEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
