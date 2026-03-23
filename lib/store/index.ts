import { JsonAgentsStoreAdapter } from "@/lib/store/adapters/json";
import { RedisAgentsStoreAdapter } from "@/lib/store/adapters/redis";
import type { AgentsStoreAdapter } from "@/lib/store/adapters/types";

let cached: AgentsStoreAdapter | null = null;

function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export async function getAgentsStoreAdapter(): Promise<AgentsStoreAdapter> {
  if (cached) return cached;

  const backend = (process.env.AGENT_STORE_BACKEND || "json").toLowerCase();

  if (backend === "prisma" && isPrismaConfigured()) {
    const { PrismaAgentsStoreAdapter } = await import("@/lib/store/adapters/prisma");
    cached = new PrismaAgentsStoreAdapter();
    return cached;
  }

  if (backend === "redis" && isRedisConfigured()) {
    cached = new RedisAgentsStoreAdapter();
    return cached;
  }

  cached = new JsonAgentsStoreAdapter();
  return cached;
}
