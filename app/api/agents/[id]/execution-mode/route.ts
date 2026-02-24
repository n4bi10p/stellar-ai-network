import { NextRequest, NextResponse } from "next/server";
import { getAgentById, updateAgent } from "@/lib/store/agents";
import { EXECUTION_MODES } from "@/lib/agents/modes";
import type { ExecutionMode } from "@/lib/store/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = (await request.json()) as { mode?: ExecutionMode };
    const mode = body.mode;
    if (!mode || !EXECUTION_MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    if (mode === "full_auto" && (process.env.ENABLE_FULL_AUTO ?? "false") !== "true") {
      return NextResponse.json({ error: "Full auto is disabled" }, { status: 403 });
    }

    const updated = await updateAgent(id, {
      executionMode: mode,
      autoExecuteEnabled: mode !== "manual",
    });

    return NextResponse.json({ success: true, mode: updated?.executionMode ?? mode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update execution mode";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
