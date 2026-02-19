import { JsonAgentsStoreAdapter } from "@/lib/store/adapters/json";
import { RedisAgentsStoreAdapter } from "@/lib/store/adapters/redis";
import type { AgentsStoreAdapter } from "@/lib/store/adapters/types";

let cached: AgentsStoreAdapter | null = null;

function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getAgentsStoreAdapter(): AgentsStoreAdapter {
  if (cached) return cached;

  const backend = (process.env.AGENT_STORE_BACKEND || "json").toLowerCase();

  if (backend === "redis" && isRedisConfigured()) {
    cached = new RedisAgentsStoreAdapter();
    return cached;
  }

  cached = new JsonAgentsStoreAdapter();
  return cached;
}

