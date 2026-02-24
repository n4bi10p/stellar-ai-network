import { NextResponse } from "next/server";
import { readAgents } from "@/lib/store/agents";
import { evaluateAgentDue } from "@/lib/agents/executor";
import { resolveExecutionMode, isReminderEligible } from "@/lib/agents/modes";
import { capItems, getPerRunCap } from "@/lib/scheduler/budget";
import { getHourlyWindow, saveDueEvents } from "@/lib/scheduler/state";
import type { DueEvent } from "@/lib/scheduler/types";

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
    const cap = getPerRunCap();
    const eligible = agents.filter((agent) =>
      isReminderEligible(resolveExecutionMode(agent))
    );
    const candidates = capItems(eligible, cap);

    const results = await Promise.all(
      candidates.map((agent) =>
        evaluateAgentDue({ agentId: agent.id, now, allowManualMode: false })
      )
    );

    const due = results.filter((r) => r.due);
    const byId = new Map(agents.map((a) => [a.id, a]));
    const window = getHourlyWindow(now);

    const events: DueEvent[] = due.map((item) => {
      const agent = byId.get(item.agentId);
      const mode = agent ? resolveExecutionMode(agent) : "manual";
      return {
        eventId: `${window}:${item.agentId}`,
        agentId: item.agentId,
        contractId: item.contractId,
        owner: agent?.owner ?? "",
        dueAt: now.toISOString(),
        reason: item.reason,
        nextExecutionAt: item.nextExecutionAt ?? null,
        executionMode: mode,
      };
    });

    await saveDueEvents(window, events);

    return NextResponse.json({
      ok: true,
      total: agents.length,
      evaluated: results.length,
      capped: eligible.length > cap,
      window,
      due: due.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron due-check failed";
    console.error("[Cron due-check] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
