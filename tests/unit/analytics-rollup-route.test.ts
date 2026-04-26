import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPrismaClient = vi.fn();
const mockUpsertDailyStats = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: mockGetPrismaClient,
}));

vi.mock("@/lib/analytics/platform-metrics", () => ({
  upsertDailyStats: mockUpsertDailyStats,
}));

describe("analytics rollup cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    process.env.CRON_SECRET = "secret";
    mockGetPrismaClient.mockReturnValue({});
    mockUpsertDailyStats.mockImplementation(async (_prisma, date: Date) => ({
      date: date.toISOString(),
      dau: 3,
      executions: 4,
      successRate: 75,
    }));
  });

  it("rejects unauthorized requests", async () => {
    const { GET } = await import("@/app/api/cron/analytics-rollup/route");
    const response = await GET(
      new NextRequest("http://localhost/api/cron/analytics-rollup")
    );

    expect(response.status).toBe(401);
  });

  it("rolls up the requested number of days when authorized", async () => {
    const { GET } = await import("@/app/api/cron/analytics-rollup/route");
    const response = await GET(
      new NextRequest("http://localhost/api/cron/analytics-rollup?days=3", {
        headers: {
          authorization: "Bearer secret",
        },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(3);
    expect(mockUpsertDailyStats).toHaveBeenCalledTimes(3);
  });
});
