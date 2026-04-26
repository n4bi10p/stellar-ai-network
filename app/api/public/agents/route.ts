// GET /api/public/agents — Public agent template discovery API
// Rate-limited. No auth required. Returns available agent templates.
// This is the externally-documented public API for integrators.

import { NextRequest, NextResponse } from "next/server";
import { AGENT_TEMPLATES } from "@/lib/agents/templates";
import { getCached, setCached } from "@/lib/cache/cache";
import {
  buildRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/middleware/rateLimiter";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("api/public/agents");

// Public API — more generous limits (30 req / minute per IP)
const RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

const CACHE_KEY = "public:agent-templates";
const CACHE_TTL_SECONDS = 300; // 5 min — templates rarely change

export async function GET(request: NextRequest) {
  // Rate limit
  const key = buildRateLimitKey(request, "public:agents");
  const rl = checkRateLimit(key, RATE_LIMIT);
  if (!rl.allowed) {
    return rateLimitResponse(rl, "Too many requests. Please slow down.");
  }

  // Cache
  const cached = getCached<object>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}`,
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  }

  const templates = AGENT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    strategy: t.strategy,
    icon: t.icon,
    // Omit internal defaults to keep the API surface clean
    defaultConfig: {
      intervalSeconds: (t.defaults as Record<string, unknown>)?.intervalSeconds ?? null,
      maxExecutions: (t.defaults as Record<string, unknown>)?.maxExecutions ?? null,
    },
  }));

  const result = {
    templates,
    count: templates.length,
    generatedAt: new Date().toISOString(),
    version: "1.0",
    docs: "https://stellar-ai-network.vercel.app/docs",
  };

  setCached(CACHE_KEY, result, CACHE_TTL_SECONDS);
  log.info("public templates served", { count: templates.length });

  return NextResponse.json(result, {
    headers: {
      "X-Cache": "MISS",
      "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}`,
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
