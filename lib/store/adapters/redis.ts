import type { StoredAgent } from "@/lib/store/types";
import type { AgentsStoreAdapter } from "./types";

interface UpstashResponse<T> {
  result: T;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function upstashCommand<T>(command: unknown[]): Promise<T> {
  const baseUrl = requiredEnv("UPSTASH_REDIS_REST_URL");
  const token = requiredEnv("UPSTASH_REDIS_REST_TOKEN");

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
    throw new Error(`Upstash request failed with status ${res.status}`);
  }

  const data = (await res.json()) as UpstashResponse<T>;
  return data.result;
}

export class RedisAgentsStoreAdapter implements AgentsStoreAdapter {
  kind: "redis" = "redis";

  private readonly key: string;

  constructor() {
    this.key = process.env.AGENTS_STORE_REDIS_KEY || "agents:all";
  }

  async readAll(): Promise<StoredAgent[]> {
    const raw = await upstashCommand<string | null>(["GET", this.key]);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as StoredAgent[]) : [];
    } catch {
      return [];
    }
  }

  async writeAll(agents: StoredAgent[]): Promise<void> {
    await upstashCommand<string>(["SET", this.key, JSON.stringify(agents)]);
  }
}

