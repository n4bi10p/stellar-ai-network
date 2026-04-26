// Tests for GET /api/analytics/metrics

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock cache ─────────────────────────────────────────────────────────────
vi.mock("@/lib/cache/cache", () => ({
  getCached: vi.fn().mockReturnValue(null),
  setCached: vi.fn(),
}));

// ── Mock Prisma ────────────────────────────────────────────────────────────
const mockDailyRows = [
  {
    date: new Date("2026-04-20"),
    dau: 5, wau: 12, mau: 30,
    newUsers: 2, totalUsers: 30, totalAgents: 8, runningAgents: 6,
    executions: 20, successfulExecutions: 18, failedExecutions: 2,
    txVolume: 150.5, avgTxSize: 7.525, successRate: 90, retention7d: 0.8,
  },
  {
    date: new Date("2026-04-21"),
    dau: 7, wau: 14, mau: 31,
    newUsers: 1, totalUsers: 31, totalAgents: 9, runningAgents: 7,
    executions: 25, successfulExecutions: 24, failedExecutions: 1,
    txVolume: 200.0, avgTxSize: 8.0, successRate: 96, retention7d: 0.85,
  },
];

const mockLiveSummary = [
  { totalExecutions: BigInt(45), successfulExecutions: BigInt(42), failedExecutions: BigInt(3) },
];

// Track call order so we can return the right mock for each $queryRaw call
let callCount = 0;

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    $queryRaw: vi.fn().mockImplementation(() => {
      callCount++;
      // First call = DailyStats, second call = ExecutionEvent live summary
      if (callCount % 2 === 1) return Promise.resolve(mockDailyRows);
      return Promise.resolve(mockLiveSummary);
    }),
  }),
}));


import { GET } from "@/app/api/analytics/metrics/route";
import * as cacheModule from "@/lib/cache/cache";

function makeReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/analytics/metrics");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("GET /api/analytics/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    vi.mocked(cacheModule.getCached).mockReturnValue(null);
  });

  it("returns 200 with summary and series", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("series");
    expect(data).toHaveProperty("period", "7d");
  });

  it("summary.totalExecutions reflects live data", async () => {
    const res = await GET(makeReq({ period: "7d" }));
    const data = await res.json();
    expect(data.summary.totalExecutions).toBe(45);
    expect(data.summary.successfulExecutions).toBe(42);
    expect(data.summary.failedExecutions).toBe(3);
  });

  it("series contains correct number of rows", async () => {
    const res = await GET(makeReq({ period: "7d" }));
    const data = await res.json();
    expect(data.series).toHaveLength(2);
    expect(data.series[0]).toHaveProperty("dau");
    expect(data.series[0]).toHaveProperty("successRate");
    expect(data.series[0]).toHaveProperty("date");
  });

  it("accepts 30d period", async () => {
    const res = await GET(makeReq({ period: "30d" }));
    const data = await res.json();
    expect(data.period).toBe("30d");
  });

  it("returns owner when specified", async () => {
    const res = await GET(makeReq({ owner: "GOWNER123" }));
    const data = await res.json();
    expect(data.owner).toBe("GOWNER123");
  });

  it("includes generatedAt timestamp", async () => {
    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.generatedAt).toBeTruthy();
    expect(new Date(data.generatedAt).getTime()).not.toBeNaN();
  });
});
