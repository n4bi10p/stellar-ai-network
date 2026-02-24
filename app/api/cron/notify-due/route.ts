import { NextResponse } from "next/server";
import { readAgents } from "@/lib/store/agents";
import { dispatchReminders } from "@/lib/reminders/dispatcher";
import { getHourlyWindow, loadDueEvents, markIdempotentOnce, getDailyWindow } from "@/lib/scheduler/state";
import { capItems } from "@/lib/scheduler/budget";
import { retryWithBackoff } from "@/lib/scheduler/retry";
import type { DueEvent } from "@/lib/scheduler/types";
import { sendEmailReminder } from "@/lib/reminders/email";
import { sendTelegramReminder } from "@/lib/reminders/telegram";
import { sendDiscordReminder } from "@/lib/reminders/discord";

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

  try {
    const now = new Date();
    const window = getHourlyWindow(now);
    const agents = await readAgents();
    const dueEvents = capItems(await loadDueEvents(window));
    const dueMap = new Map(dueEvents.map((event) => [event.agentId, event]));
    const dailyWindow = getDailyWindow(now);

    const notified = [];
    const dailyBuckets = new Map<string, DueEvent[]>();
    for (const agent of agents) {
      const dueEvent = dueMap.get(agent.id);
      if (!dueEvent) continue;

      if ((agent.reminders?.digestMode ?? "instant") === "daily") {
        const digestKey = `${agent.owner}:${dailyWindow}`;
        const existing = dailyBuckets.get(digestKey) ?? [];
        existing.push(dueEvent);
        dailyBuckets.set(digestKey, existing);
        continue;
      }

      const shouldNotify = await markIdempotentOnce({
        kind: "notify",
        eventId: dueEvent.eventId,
      });
      if (!shouldNotify) continue;

      const result = await retryWithBackoff(() =>
        dispatchReminders({
          agent,
          due: {
            agentId: dueEvent.agentId,
            contractId: dueEvent.contractId,
            due: true,
            reason: dueEvent.reason,
            nextExecutionAt: dueEvent.nextExecutionAt,
          },
        })
      );
      notified.push(result);
    }

    const digestErrors: string[] = [];
    for (const [digestKey, events] of dailyBuckets.entries()) {
      const first = events[0];
      const ownerAgent = agents.find((a) => a.id === first.agentId);
      if (!ownerAgent) continue;

      const shouldNotify = await markIdempotentOnce({
        kind: "notify",
        eventId: `digest:${digestKey}`,
        ttlSeconds: 28 * 60 * 60,
      });
      if (!shouldNotify) continue;

      const subject = `Daily agent digest (${events.length} due)`;
      const lines = events.map(
        (event, index) => `${index + 1}. ${event.contractId} — ${event.reason ?? "Due"}`
      );
      const text = `Daily due agent summary:\n${lines.join("\n")}`;

      try {
        if (ownerAgent.reminders?.channels?.email && ownerAgent.reminders.emailAddress) {
          await retryWithBackoff(() =>
            sendEmailReminder({
              to: ownerAgent.reminders!.emailAddress!,
              subject,
              text,
            })
          );
        }
        if (ownerAgent.reminders?.channels?.telegram && ownerAgent.reminders.telegramChatId) {
          await retryWithBackoff(() =>
            sendTelegramReminder({
              chatId: ownerAgent.reminders!.telegramChatId!,
              text,
            })
          );
        }
        if (ownerAgent.reminders?.channels?.discord && ownerAgent.reminders.discordWebhookUrl) {
          await retryWithBackoff(() =>
            sendDiscordReminder({
              webhookUrl: ownerAgent.reminders!.discordWebhookUrl!,
              content: text,
            })
          );
        }
      } catch (err) {
        digestErrors.push(err instanceof Error ? err.message : "Daily digest send failed");
      }
    }

    return NextResponse.json({
      ok: true,
      window,
      due: dueEvents.length,
      notified: notified.length,
      digests: dailyBuckets.size,
      errors: notified.filter((n) => n.errors.length > 0).length,
      digestErrors: digestErrors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron notify failed";
    console.error("[Cron notify-due] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
