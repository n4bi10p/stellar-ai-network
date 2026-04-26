import { NextResponse } from "next/server";
import { getAgentById } from "@/lib/store/agents";
import { executeAgentWithSecret } from "@/lib/agents/executor";
import { getHourlyWindow, loadDueEvents, markIdempotentOnce } from "@/lib/scheduler/state";
import { capItems } from "@/lib/scheduler/budget";
import { isFullAuto } from "@/lib/agents/modes";
import { decryptAgentSecret } from "@/lib/security/key-vault";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((process.env.ENABLE_FULL_AUTO ?? "false") !== "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "ENABLE_FULL_AUTO=false" });
  }

  try {
    const window = getHourlyWindow(new Date());
    const dueEvents = capItems(await loadDueEvents(window));

    const outcomes = [] as Array<{ eventId: string; agentId: string; executed: boolean; reason?: string; error?: string; txHash?: string }>;

    for (const event of dueEvents) {
      if (!isFullAuto(event.executionMode)) continue;

      const shouldExecute = await markIdempotentOnce({ kind: "exec", eventId: event.eventId });
      if (!shouldExecute) continue;

      const agent = await getAgentById(event.agentId);
      if (!agent) {
        outcomes.push({ eventId: event.eventId, agentId: event.agentId, executed: false, error: "Agent not found" });
        continue;
      }

      if (!agent.fullAuto?.consentAcceptedAt) {
        outcomes.push({ eventId: event.eventId, agentId: event.agentId, executed: false, error: "Missing full-auto consent" });
        continue;
      }

      try {
        const secretKey = decryptAgentSecret(agent.fullAuto?.encryptedSecret);
        const result = await executeAgentWithSecret({ agentId: agent.id, secretKey });

        outcomes.push({
          eventId: event.eventId,
          agentId: event.agentId,
          executed: result.executed,
          reason: result.reason,
          error: result.error,
          txHash: result.txHash,
        });
      } catch (err) {
        outcomes.push({
          eventId: event.eventId,
          agentId: event.agentId,
          executed: false,
          error: err instanceof Error ? err.message : "Auto execution failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      window,
      processed: outcomes.length,
      executed: outcomes.filter((o) => o.executed).length,
      failed: outcomes.filter((o) => !o.executed).length,
      outcomes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron auto-execute failed";
    console.error("[Cron auto-execute] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
