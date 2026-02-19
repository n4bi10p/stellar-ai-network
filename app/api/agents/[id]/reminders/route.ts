import { NextRequest, NextResponse } from "next/server";
import { getAgentById, updateAgent } from "@/lib/store/agents";

type RemindersPayload = {
  channels?: {
    inApp?: boolean;
    email?: boolean;
    telegram?: boolean;
    discord?: boolean;
  };
  emailAddress?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  digestMode?: "instant" | "daily";
};

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
    return NextResponse.json({ reminders: agent.reminders ?? {} });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load reminders";
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

    const payload = (await request.json()) as RemindersPayload;

    const merged = {
      ...(agent.reminders ?? {}),
      ...(payload ?? {}),
      channels: {
        ...(agent.reminders?.channels ?? {}),
        ...(payload.channels ?? {}),
      },
    };

    await updateAgent(id, { reminders: merged });
    return NextResponse.json({ success: true, reminders: merged });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save reminders";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
