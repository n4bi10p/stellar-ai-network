// POST /api/workflows/[id]/run — manually trigger a workflow execution

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowById, runWorkflow } from "@/lib/agents/workflow-orchestrator";
import { buildRateLimitKey, checkRateLimit, rateLimitResponse } from "@/lib/middleware/rateLimiter";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("api/workflows/[id]/run");
const RATE = { maxRequests: 10, windowMs: 60_000 };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(buildRateLimitKey(request, "workflows:run"), RATE);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id } = await params;

  let body: { owner?: string; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const { owner, dryRun = false } = body;
  if (!owner) return NextResponse.json({ error: "owner is required" }, { status: 400 });

  const workflow = await getWorkflowById(id);
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (workflow.owner !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (workflow.status === "paused") return NextResponse.json({ error: "Workflow is paused" }, { status: 409 });
  if (workflow.status === "archived") return NextResponse.json({ error: "Workflow is archived" }, { status: 409 });

  log.info("workflow run triggered", { id, owner, dryRun, steps: workflow.steps.length });

  try {
    const result = await runWorkflow({
      workflow,
      triggerSource: "manual",
      dryRun,
    });

    return NextResponse.json({
      success: result.status !== "failed",
      dryRun,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Workflow run failed";
    log.error(msg, { workflowId: id });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
