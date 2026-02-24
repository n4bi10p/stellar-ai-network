import type { StoredAgent } from "@/lib/store/types";
import type { AgentDueResult } from "@/lib/agents/executor";
import { sendEmailReminder } from "./email";
import { sendTelegramReminder } from "./telegram";
import { sendDiscordReminder } from "./discord";

export interface ReminderDispatchResult {
  agentId: string;
  channels: {
    inApp?: boolean;
    email?: boolean;
    telegram?: boolean;
    discord?: boolean;
  };
  errors: string[];
}

function buildMessage(agent: StoredAgent, due: AgentDueResult): string {
  const name = agent.name || agent.contractId.slice(0, 12);
  const reason = due.reason ?? "Due for execution";
  return `Agent due: ${name}\nStrategy: ${agent.strategy}\nReason: ${reason}\nContract: ${agent.contractId}`;
}

export async function dispatchReminders(opts: {
  agent: StoredAgent;
  due: AgentDueResult;
}): Promise<ReminderDispatchResult> {
  const { agent, due } = opts;
  const errors: string[] = [];

  const channels = {
    inApp: agent.reminders?.channels?.inApp ?? true,
    email: agent.reminders?.channels?.email ?? false,
    telegram: agent.reminders?.channels?.telegram ?? false,
    discord: agent.reminders?.channels?.discord ?? false,
  };

  const message = buildMessage(agent, due);

  if (channels.email) {
    const email = agent.reminders?.emailAddress;
    if (!email) {
      errors.push("Missing emailAddress");
    } else {
      try {
        await sendEmailReminder({
          to: email,
          subject: "Agent due for execution",
          text: message,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Email send failed");
      }
    }
  }

  if (channels.telegram) {
    const chatId = agent.reminders?.telegramChatId;
    if (!chatId) {
      errors.push("Missing telegramChatId");
    } else {
      try {
        await sendTelegramReminder({ chatId, text: message });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Telegram send failed");
      }
    }
  }

  if (channels.discord) {
    const webhookUrl = agent.reminders?.discordWebhookUrl;
    if (!webhookUrl) {
      errors.push("Missing discordWebhookUrl");
    } else {
      try {
        await sendDiscordReminder({ webhookUrl, content: message });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Discord send failed");
      }
    }
  }

  return { agentId: agent.id, channels, errors };
}
