import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRateLimitKey,
  checkRateLimit,
  resetRateLimitStore,
} from "@/lib/middleware/rateLimiter";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    resetRateLimitStore();
  });

  afterEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests until the bucket is exhausted", () => {
    const request = new NextRequest("http://localhost/api/ai/parse", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    const key = buildRateLimitKey(request, "ai:parse");
    const first = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });
    const second = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });
    const third = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the bucket after the window expires", () => {
    const request = new NextRequest("http://localhost/api/agents", {
      headers: {
        "x-forwarded-for": "203.0.113.22",
      },
    });

    const key = buildRateLimitKey(request, "agents:create");
    checkRateLimit(key, { maxRequests: 1, windowMs: 10_000 });
    const blocked = checkRateLimit(key, { maxRequests: 1, windowMs: 10_000 });

    vi.advanceTimersByTime(10_001);

    const reset = checkRateLimit(key, { maxRequests: 1, windowMs: 10_000 });

    expect(blocked.allowed).toBe(false);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(0);
  });
});
