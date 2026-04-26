// GET /api/workflows/[id] — fetch workflow details + recent runs
// PATCH /api/workflows/[id] — update name/description/status/steps

import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";
import { getWorkflowById, listWorkflowRuns } from "@/lib/agents/workflow-orchestrator";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("api/workflows/[id]");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workflow = await getWorkflowById(id);
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const runs = await listWorkflowRuns(id, 10);
  return NextResponse.json({ workflow, runs });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    owner?: string;
    name?: string;
    description?: string;
    status?: string;
    steps?: unknown[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner, name, description, status, steps } = body;
  if (!owner) return NextResponse.json({ error: "owner is required" }, { status: 400 });

  const existing = await getWorkflowById(id);
  if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (existing.owner !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (status && !["active", "paused", "archived"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();

    if (name !== undefined) {
      await prisma.$executeRaw`UPDATE "AgentWorkflow" SET "name" = ${name}, "updatedAt" = now() WHERE "id" = ${id}`;
    }
    if (description !== undefined) {
      await prisma.$executeRaw`UPDATE "AgentWorkflow" SET "description" = ${description}, "updatedAt" = now() WHERE "id" = ${id}`;
    }
    if (status !== undefined) {
      await prisma.$executeRaw`UPDATE "AgentWorkflow" SET "status" = ${status}, "updatedAt" = now() WHERE "id" = ${id}`;
    }
    if (steps !== undefined && Array.isArray(steps) && steps.length >= 2) {
      await prisma.$executeRaw`UPDATE "AgentWorkflow" SET "steps" = ${JSON.stringify(steps)}::jsonb, "updatedAt" = now() WHERE "id" = ${id}`;
    }

    log.info("workflow updated", { id, owner });
    const updated = await getWorkflowById(id);
    return NextResponse.json({ success: true, workflow: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update workflow";
    log.error(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
