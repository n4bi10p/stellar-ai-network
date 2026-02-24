import fs from "fs/promises";
import path from "path";
import type { DueEvent } from "@/lib/scheduler/types";

const HOUR_TTL_SECONDS = 2 * 60 * 60;
const IDEMPOTENCY_TTL_SECONDS = 26 * 60 * 60;

type LocalState = {
  due: Record<string, DueEvent[]>;
  idem: Record<string, string>;
};

const STATE_FILE = path.join(process.cwd(), "data", "scheduler-state.json");

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand<T>(command: unknown[]): Promise<T> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) throw new Error("Redis is not configured");

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash command failed: ${res.status}`);
  }

  const data = (await res.json()) as { result: T };
  return data.result;
}

async function ensureLocalStateFile(): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  try {
    await fs.access(STATE_FILE);
  } catch {
    const init: LocalState = { due: {}, idem: {} };
    await fs.writeFile(STATE_FILE, JSON.stringify(init, null, 2), "utf-8");
  }
}

async function loadLocalState(): Promise<LocalState> {
  await ensureLocalStateFile();
  const raw = await fs.readFile(STATE_FILE, "utf-8");
  const parsed = JSON.parse(raw) as LocalState;
  return {
    due: parsed.due ?? {},
    idem: parsed.idem ?? {},
  };
}

async function saveLocalState(state: LocalState): Promise<void> {
  await ensureLocalStateFile();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function getHourlyWindow(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

export function getDailyWindow(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function saveDueEvents(window: string, events: DueEvent[]): Promise<void> {
  if (redisConfigured()) {
    const key = `due:${window}`;
    await redisCommand(["SET", key, JSON.stringify(events), "EX", HOUR_TTL_SECONDS]);
    return;
  }

  const state = await loadLocalState();
  state.due[window] = events;
  await saveLocalState(state);
}

export async function loadDueEvents(window: string): Promise<DueEvent[]> {
  if (redisConfigured()) {
    const key = `due:${window}`;
    const raw = await redisCommand<string | null>(["GET", key]);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as DueEvent[]) : [];
    } catch {
      return [];
    }
  }

  const state = await loadLocalState();
  return state.due[window] ?? [];
}

export async function markIdempotentOnce(options: {
  kind: "notify" | "exec";
  eventId: string;
  ttlSeconds?: number;
}): Promise<boolean> {
  const ttl = options.ttlSeconds ?? IDEMPOTENCY_TTL_SECONDS;
  const key = `${options.kind}:${options.eventId}`;

  if (redisConfigured()) {
    const result = await redisCommand<string | null>([
      "SET",
      key,
      "1",
      "EX",
      ttl,
      "NX",
    ]);
    return result === "OK";
  }

  const state = await loadLocalState();
  const now = Date.now();

  for (const [id, expiresAt] of Object.entries(state.idem)) {
    if (new Date(expiresAt).getTime() <= now) {
      delete state.idem[id];
    }
  }

  if (state.idem[key]) return false;

  state.idem[key] = new Date(now + ttl * 1000).toISOString();
  await saveLocalState(state);
  return true;
}
