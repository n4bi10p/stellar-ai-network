import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMemoryCache } from "@/lib/cache/cache";

const mockGetPrismaClient = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: mockGetPrismaClient,
}));

describe("analytics metrics route", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFallback = process.env.ANALYTICS_DEMO_FALLBACK;

  const setNodeEnv = (value: string | undefined) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    clearMemoryCache();
    delete process.env.ANALYTICS_DEMO_FALLBACK;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    clearMemoryCache();
    vi.useRealTimers();
    setNodeEnv(originalNodeEnv);
    if (originalFallback === undefined) {
      delete process.env.ANALYTICS_DEMO_FALLBACK;
    } else {
      process.env.ANALYTICS_DEMO_FALLBACK = originalFallback;
    }
  });

  it("returns 503 in production when analytics db is unavailable", async () => {
    setNodeEnv("production");
    mockGetPrismaClient.mockReturnValue({
      user: {
        count: vi.fn().mockRejectedValue(new Error("db down")),
      },
      userEvent: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      executionEvent: {
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      agent: {
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      dailyStats: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    });

    const { GET } = await import("@/app/api/internal/analytics-metrics/route");
    const response = await GET(
      new NextRequest("http://localhost/api/internal/analytics-metrics")
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.isDemo).toBe(false);
    expect(body.error).toBe("Analytics data unavailable");
  });

  it("includes DAU, WAU, retention, and failure reasons in real metrics", async () => {
    setNodeEnv("test");

    const userEventFindMany = vi.fn().mockImplementation((args: any) => {
      if (args.where?.eventName === "wallet_connected") {
        return Promise.resolve([{ userId: "u1" }, { userId: "u2" }]);
      }

      if (args.where?.createdAt?.lt) {
        return Promise.resolve([{ userId: "u2" }, { userId: "u5" }]);
      }

      const gte = args.where?.createdAt?.gte;
      if (gte instanceof Date) {
        const lookbackHours = (Date.now() - gte.getTime()) / (1000 * 60 * 60);
        if (lookbackHours <= 25) {
          return Promise.resolve([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);
        }
      }

      return Promise.resolve([
        { userId: "u1" },
        { userId: "u2" },
        { userId: "u3" },
        { userId: "u4" },
      ]);
    });

    const executionEventCount = vi.fn().mockImplementation((args?: any) => {
      if (args?.where?.status === "success") {
        return Promise.resolve(9);
      }
      return Promise.resolve(12);
    });

    const executionEventGroupBy = vi.fn().mockImplementation((args: any) => {
      if (args.by?.includes("status")) {
        return Promise.resolve([
          { status: "success", _count: { status: 9 } },
          { status: "failed", _count: { status: 3 } },
        ]);
      }

      return Promise.resolve([
        { errorMsg: "insufficient_balance", _count: { errorMsg: 2 } },
        { errorMsg: "user_rejected", _count: { errorMsg: 1 } },
      ]);
    });

    mockGetPrismaClient.mockReturnValue({
      user: {
        count: vi.fn().mockResolvedValue(10),
      },
      userEvent: {
        findMany: userEventFindMany,
        count: vi.fn().mockResolvedValue(100),
      },
      executionEvent: {
        count: executionEventCount,
        groupBy: executionEventGroupBy,
        findMany: vi.fn().mockResolvedValue([
          { metadata: { transactionType: "agent_execution" } },
          { metadata: { transactionType: "manual_transfer" } },
          { metadata: { transactionType: "manual_soroban" } },
          { metadata: { transactionType: "agent_execution" } },
        ]),
      },
      agent: {
        count: vi.fn().mockImplementation((args?: any) => {
          if (args?.where) {
            return Promise.resolve(2);
          }
          return Promise.resolve(4);
        }),
        groupBy: vi.fn().mockResolvedValue([
          { strategy: "dca", _count: { strategy: 2 } },
          { strategy: "rebalance", _count: { strategy: 1 } },
        ]),
      },
      dailyStats: {
        findMany: vi.fn().mockResolvedValue([
          {
            date: new Date("2026-04-25T00:00:00.000Z"),
            dau: 2,
            wau: 4,
            mau: 5,
            newUsers: 1,
            totalUsers: 8,
            totalAgents: 3,
            runningAgents: 2,
            executions: 6,
            successfulExecutions: 5,
            failedExecutions: 1,
            txVolume: 15,
            avgTxSize: 2.5,
            successRate: 83.3,
            retention7d: 50,
          },
        ]),
      },
    });

    const { GET } = await import("@/app/api/internal/analytics-metrics/route");
    const response = await GET(
      new NextRequest("http://localhost/api/internal/analytics-metrics")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isDemo).toBe(false);
    expect(body.metrics.dau).toBe(3);
    expect(body.metrics.wau).toBe(4);
    expect(body.metrics.retention7d).toBe(50);
    expect(body.history.length).toBeGreaterThan(0);
    expect(body.breakdowns.failureReasons).toEqual([
      { reason: "insufficient_balance", count: 2 },
      { reason: "user_rejected", count: 1 },
    ]);
  });

  it("reuses cached analytics results for repeated reads within the ttl", async () => {
    setNodeEnv("test");

    const userCount = vi.fn().mockResolvedValue(10);
    const userEventFindMany = vi.fn().mockImplementation((args: any) => {
      if (args.where?.eventName === "wallet_connected") {
        return Promise.resolve([{ userId: "u1" }, { userId: "u2" }]);
      }

      if (args.where?.createdAt?.lt) {
        return Promise.resolve([{ userId: "u2" }, { userId: "u5" }]);
      }

      const gte = args.where?.createdAt?.gte;
      if (gte instanceof Date) {
        const lookbackHours = (Date.now() - gte.getTime()) / (1000 * 60 * 60);
        if (lookbackHours <= 25) {
          return Promise.resolve([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);
        }
      }

      return Promise.resolve([
        { userId: "u1" },
        { userId: "u2" },
        { userId: "u3" },
        { userId: "u4" },
      ]);
    });

    mockGetPrismaClient.mockReturnValue({
      user: {
        count: userCount,
      },
      userEvent: {
        findMany: userEventFindMany,
        count: vi.fn().mockResolvedValue(100),
      },
      executionEvent: {
        count: vi
          .fn()
          .mockResolvedValueOnce(9)
          .mockResolvedValueOnce(12),
        groupBy: vi.fn().mockImplementation((args: any) => {
          if (args.by?.includes("status")) {
            return Promise.resolve([
              { status: "success", _count: { status: 9 } },
              { status: "failed", _count: { status: 3 } },
            ]);
          }

          return Promise.resolve([
            { errorMsg: "insufficient_balance", _count: { errorMsg: 2 } },
          ]);
        }),
        findMany: vi.fn().mockResolvedValue([
          { metadata: { transactionType: "agent_execution" } },
          { metadata: { transactionType: "manual_transfer" } },
        ]),
      },
      agent: {
        count: vi.fn().mockImplementation((args?: any) => {
          if (args?.where) return Promise.resolve(2);
          return Promise.resolve(4);
        }),
        groupBy: vi.fn().mockResolvedValue([
          { strategy: "dca", _count: { strategy: 2 } },
        ]),
      },
      dailyStats: {
        findMany: vi.fn().mockResolvedValue([
          {
            date: new Date("2026-04-25T00:00:00.000Z"),
            dau: 2,
            wau: 4,
            mau: 5,
            newUsers: 1,
            totalUsers: 8,
            totalAgents: 3,
            runningAgents: 2,
            executions: 6,
            successfulExecutions: 5,
            failedExecutions: 1,
            txVolume: 15,
            avgTxSize: 2.5,
            successRate: 83.3,
            retention7d: 50,
          },
        ]),
      },
    });

    const { GET } = await import("@/app/api/internal/analytics-metrics/route");

    const first = await GET(
      new NextRequest("http://localhost/api/internal/analytics-metrics")
    );
    const firstCallCount = userCount.mock.calls.length;
    const second = await GET(
      new NextRequest("http://localhost/api/internal/analytics-metrics")
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstCallCount).toBeGreaterThan(0);
    expect(userCount.mock.calls.length).toBe(firstCallCount);
  });
});
