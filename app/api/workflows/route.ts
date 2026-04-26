// GET /api/workflows?owner= — list workflows
// POST /api/workflows — create workflow

import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";
import { listWorkflowsByOwner } from "@/lib/agents/workflow-orchestrator";
import { buildRateLimitKey, checkRateLimit, rateLimitResponse } from "@/lib/middleware/rateLimiter";
import { createLogger } from "@/lib/logging/logger";
import type { WorkflowStep } from "@/lib/agents/workflow-types";

const log = createLogger("api/workflows");
const RATE = { maxRequests: 30, windowMs: 60_000 };

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(buildRateLimitKey(request, "workflows:list"), RATE);
  if (!rl.allowed) return rateLimitResponse(rl);

  const owner = request.nextUrl.searchParams.get("owner");
  if (!owner) return NextResponse.json({ error: "owner is required" }, { status: 400 });

  const workflows = await listWorkflowsByOwner(owner);
  return NextResponse.json({ workflows, count: workflows.length });
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(buildRateLimitKey(request, "workflows:create"), RATE);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: {
    owner?: string;
    name?: string;
    description?: string;
    steps?: WorkflowStep[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner, name, steps, description } = body;
  if (!owner || !name) return NextResponse.json({ error: "owner and name are required" }, { status: 400 });
  if (!Array.isArray(steps) || steps.length < 2) {
    return NextResponse.json({ error: "A workflow requires at least 2 steps" }, { status: 400 });
  }
  if (steps.length > 10) {
    return NextResponse.json({ error: "Workflows are limited to 10 steps" }, { status: 400 });
  }

  // Validate each step
  for (const [i, step] of steps.entries()) {
    if (!step.stepId || !step.agentId || !step.triggerCondition) {
      return NextResponse.json({ error: `Step ${i + 1} missing required fields (stepId, agentId, triggerCondition)` }, { status: 400 });
    }
  }

  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "AgentWorkflow" ("id", "owner", "name", "description", "steps", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${owner},
        ${name},
        ${description ?? null},
        ${JSON.stringify(steps)}::jsonb,
        now()
      )
      RETURNING "id"
    `;

    const id = rows[0]?.id;
    if (!id) throw new Error("Insert returned no ID");

    log.info("workflow created", { id, owner, name, stepCount: steps.length });
    return NextResponse.json({ success: true, workflowId: id, name, stepCount: steps.length }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create workflow";
    log.error(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
