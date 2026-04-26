-- Level 6 governance controls for agent safety
ALTER TABLE "Agent"
ADD COLUMN IF NOT EXISTS "governance" JSONB;
