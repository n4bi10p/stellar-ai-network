import { NextRequest, NextResponse } from "next/server";
import { addExecutionLog, listExecutionLogsByAgent } from "@/lib/store/execution-logs";
import {
  getAgentById,
  recordAgentExecution,
  updateAgent,
  updateAgentStrategy,
} from "@/lib/store/agents";

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const logs = await listExecutionLogsByAgent(id);
    return NextResponse.json({ logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch execution logs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const {
      triggerSource,
      executionMode,
      success,
      txHash,
      failureReason,
      metadata,
      nextExecutionAt,
      recordExecution,
    } = await request.json();

    if (!triggerSource || typeof success !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: triggerSource, success" },
        { status: 400 }
      );
    }

    const log = await addExecutionLog({
      agentId: id,
      triggerSource,
      executionMode,
      success,
      txHash: txHash ?? null,
      failureReason: failureReason ?? null,
      metadata: (metadata as Record<string, unknown> | undefined) ?? undefined,
    });

    const metadataRecord = getRecord(metadata);
    const workflowMetadata = getRecord(metadataRecord?.workflow);
    const workflowSuccessStatePatch = getRecord(
      workflowMetadata?.successStatePatch
    );

    if (success && agent.strategy === "workflow_chain" && workflowSuccessStatePatch) {
      await updateAgentStrategy(id, {
        strategyState: workflowSuccessStatePatch,
        nextExecutionAt: nextExecutionAt ?? null,
      });
    }

    if (recordExecution) {
      await recordAgentExecution(id, {
        lastExecutionAt: log.createdAt,
        nextExecutionAt: nextExecutionAt ?? null,
      });
    }

    if (txHash) {
      await updateAgent(id, { txHash });
    }

    return NextResponse.json({ success: true, log });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to record execution log";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
