import fs from "fs/promises";
import path from "path";
import type { DueEvent } from "@/lib/scheduler/types";
import { getPrismaClient } from "@/lib/db/client";

const HOUR_TTL_SECONDS = 2 * 60 * 60;
const IDEMPOTENCY_TTL_SECONDS = 26 * 60 * 60;

type SchedulerBackend = "postgres" | "redis" | "local";

type LocalState = {
  due: Record<string, DueEvent[]>;
  idem: Record<string, string>;
};

const STATE_FILE =
  process.env.SCHEDULER_STATE_FILE ||
  (process.env.NODE_ENV === "test"
    ? path.join(process.cwd(), "data", ".scheduler-state.test.json")
    : path.join(process.cwd(), "data", "scheduler-state.json"));

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function postgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function resolveBackend(): SchedulerBackend {
  const configured = process.env.SCHEDULER_STATE_BACKEND;
  if (configured === "postgres" || configured === "redis" || configured === "local") {
    return configured;
  }

  if (process.env.NODE_ENV === "test") {
    return "local";
  }

  // Auto-detect: prefer postgres (Supabase) when DATABASE_URL is set.
  // This is the correct backend for Vercel/serverless deployments.
  if (postgresConfigured()) {
    return "postgres";
  }

  if (redisConfigured()) {
    return "redis";
  }

  // In production without DB or Redis configured, fail loudly rather than
  // attempting filesystem writes that will throw on read-only serverless envs.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Scheduler] No storage backend available. " +
      "Set DATABASE_URL (Supabase) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN."
    );
  }

  return "local";
}

export function getSchedulerBackendKind(): SchedulerBackend {
  return resolveBackend();
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
  const backend = resolveBackend();

  if (backend === "postgres") {
    const prisma = getPrismaClient();
    const expiresAt = new Date(Date.now() + HOUR_TTL_SECONDS * 1000);
    const payload = JSON.stringify(events);

    await prisma.$executeRaw`
      INSERT INTO "SchedulerDueWindow" ("window", "events", "expiresAt", "createdAt", "updatedAt")
      VALUES (${window}, ${payload}::jsonb, ${expiresAt}, now(), now())
      ON CONFLICT ("window")
      DO UPDATE
      SET "events" = EXCLUDED."events", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = now()
    `;

    await prisma.$executeRaw`
      DELETE FROM "SchedulerDueWindow" WHERE "expiresAt" <= now()
    `;
    return;
  }

  if (backend === "redis") {
    const key = `due:${window}`;
    await redisCommand(["SET", key, JSON.stringify(events), "EX", HOUR_TTL_SECONDS]);
    return;
  }

  const state = await loadLocalState();
  state.due[window] = events;
  await saveLocalState(state);
}

export async function loadDueEvents(window: string): Promise<DueEvent[]> {
  const backend = resolveBackend();

  if (backend === "postgres") {
    const prisma = getPrismaClient();

    await prisma.$executeRaw`
      DELETE FROM "SchedulerDueWindow" WHERE "expiresAt" <= now()
    `;

    const rows = await prisma.$queryRaw<Array<{ events: unknown }>>`
      SELECT "events"
      FROM "SchedulerDueWindow"
      WHERE "window" = ${window} AND "expiresAt" > now()
      LIMIT 1
    `;

    if (rows.length === 0) return [];

    const value = rows[0].events;
    if (Array.isArray(value)) return value as DueEvent[];

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as DueEvent[]) : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  if (backend === "redis") {
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
  const backend = resolveBackend();
  const ttl = options.ttlSeconds ?? IDEMPOTENCY_TTL_SECONDS;
  const key = `${options.kind}:${options.eventId}`;

  if (backend === "postgres") {
    const prisma = getPrismaClient();
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await prisma.$executeRaw`
      DELETE FROM "SchedulerIdempotency" WHERE "expiresAt" <= now()
    `;

    const inserted = await prisma.$queryRaw<Array<{ key: string }>>`
      INSERT INTO "SchedulerIdempotency" ("key", "expiresAt", "createdAt")
      VALUES (${key}, ${expiresAt}, now())
      ON CONFLICT ("key") DO NOTHING
      RETURNING "key"
    `;

    return inserted.length > 0;
  }

  if (backend === "redis") {
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
