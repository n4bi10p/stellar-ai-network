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

  const backend = (process.env.AGENT_STORE_BACKEND || "auto").toLowerCase();

  // Explicit override: prisma
  if (backend === "prisma" && isPrismaConfigured()) {
    const { PrismaAgentsStoreAdapter } = await import("@/lib/store/adapters/prisma");
    cached = new PrismaAgentsStoreAdapter();
    return cached;
  }

  // Explicit override: redis
  if (backend === "redis" && isRedisConfigured()) {
    cached = new RedisAgentsStoreAdapter();
    return cached;
  }

  // Auto-detect: prefer Prisma when DATABASE_URL is set.
  // This is critical for Vercel/production deployments where the
  // filesystem is read-only and JSON file writes will throw a 500.
  if (backend === "auto" || backend === "json") {
    if (isPrismaConfigured()) {
      const { PrismaAgentsStoreAdapter } = await import("@/lib/store/adapters/prisma");
      cached = new PrismaAgentsStoreAdapter();
      return cached;
    }

    if (isRedisConfigured()) {
      cached = new RedisAgentsStoreAdapter();
      return cached;
    }
  }

  // Final fallback: local JSON file (dev / CI without a DB)
  cached = new JsonAgentsStoreAdapter();
  return cached;
}
