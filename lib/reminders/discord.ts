export interface DiscordReminderInput {
  webhookUrl: string;
  content: string;
}

export async function sendDiscordReminder(
  input: DiscordReminderInput
): Promise<void> {
  const res = await fetch(input.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: input.content }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord send failed: ${res.status} ${body}`);
  }
}
