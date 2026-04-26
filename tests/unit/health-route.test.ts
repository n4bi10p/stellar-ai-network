import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.fn();
const mockGetAgentsStoreAdapter = vi.fn();
const mockGetSchedulerBackendKind = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    $queryRaw: mockQueryRaw,
  }),
}));

vi.mock("@/lib/store", () => ({
  getAgentsStoreAdapter: mockGetAgentsStoreAdapter,
}));

vi.mock("@/lib/scheduler/state", () => ({
  getSchedulerBackendKind: mockGetSchedulerBackendKind,
}));

describe("health route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.DATABASE_URL = "postgres://example";
  });

  it("returns healthy when database, store, and scheduler checks pass", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockGetAgentsStoreAdapter.mockResolvedValue({
      kind: "prisma",
      readAll: vi.fn().mockResolvedValue([]),
    });
    mockGetSchedulerBackendKind.mockReturnValue("postgres");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.cache.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.store.status).toBe("ok");
    expect(body.checks.scheduler.status).toBe("ok");
  });

  it("returns degraded when fallback infrastructure is in use", async () => {
    delete process.env.DATABASE_URL;
    mockGetAgentsStoreAdapter.mockResolvedValue({
      kind: "json",
      readAll: vi.fn().mockResolvedValue([]),
    });
    mockGetSchedulerBackendKind.mockReturnValue("local");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.checks.cache.status).toBe("ok");
    expect(body.checks.database.detail).toContain("not required");
  });

  it("returns unhealthy when a required subsystem fails", async () => {
    mockQueryRaw.mockRejectedValue(new Error("db unavailable"));
    mockGetAgentsStoreAdapter.mockResolvedValue({
      kind: "prisma",
      readAll: vi.fn().mockResolvedValue([]),
    });
    mockGetSchedulerBackendKind.mockReturnValue("postgres");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("error");
    expect(body.checks.database.detail).toContain("db unavailable");
  });
});
