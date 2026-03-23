import { NextRequest, NextResponse } from "next/server";
import { getAgentsByOwner } from "@/lib/store/agents";
import { listExecutionLogsForAgents } from "@/lib/store/execution-logs";

export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get("owner");
    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner query param" },
        { status: 400 }
      );
    }

    const agents = await getAgentsByOwner(owner);
    const logs = await listExecutionLogsForAgents(agents.map((agent) => agent.id));
    const recent = logs.slice(0, 8).map((log) => {
      const agent = agents.find((item) => item.id === log.agentId);
      return {
        ...log,
        agentName: agent?.name ?? log.agentId,
        contractId: agent?.contractId ?? null,
      };
    });

    const successful = logs.filter((log) => log.success).length;
    const failed = logs.filter((log) => !log.success).length;

    return NextResponse.json({
      summary: {
        total: logs.length,
        successful,
        failed,
        successRate:
          logs.length === 0 ? 0 : Math.round((successful / logs.length) * 100),
      },
      recent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to summarize executions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
