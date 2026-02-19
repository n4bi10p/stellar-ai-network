import { NextResponse } from "next/server";
import { readAgents } from "@/lib/store/agents";
import { evaluateAgentDue } from "@/lib/agents/executor";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow when not configured
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await readAgents();
    const now = new Date();
    const results = await Promise.all(
      agents.map((agent) => evaluateAgentDue({ agentId: agent.id, now }))
    );

    const due = results.filter((r) => r.due);

    return NextResponse.json({
      ok: true,
      total: results.length,
      due: due.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron due-check failed";
    console.error("[Cron due-check] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
