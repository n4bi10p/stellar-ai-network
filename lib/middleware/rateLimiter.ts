import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

declare global {
  var __stellarRateLimitStore:
    | Map<string, RateLimitEntry>
    | undefined;
}

const rateLimitStore =
  globalThis.__stellarRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__stellarRateLimitStore) {
  globalThis.__stellarRateLimitStore = rateLimitStore;
}

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function buildRateLimitKey(
  request: NextRequest,
  scope: string,
  hint?: string
): string {
  const client = getClientIdentifier(request);
  return [scope, client, hint ?? ""].filter(Boolean).join(":");
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: options.maxRequests,
      remaining: Math.max(options.maxRequests - 1, 0),
      resetAt,
      retryAfterSeconds: Math.max(Math.ceil(options.windowMs / 1000), 1),
    };
  }

  if (existing.count >= options.maxRequests) {
    return {
      allowed: false,
      limit: options.maxRequests,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(
        Math.ceil((existing.resetAt - now) / 1000),
        1
      ),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    limit: options.maxRequests,
    remaining: Math.max(options.maxRequests - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(
      Math.ceil((existing.resetAt - now) / 1000),
      1
    ),
  };
}

export function rateLimitResponse(
  result: RateLimitResult,
  message: string = "Too many requests. Please try again shortly."
): NextResponse {
  const response = NextResponse.json(
    { error: message },
    { status: 429 }
  );

  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetAt));
  return response;
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
