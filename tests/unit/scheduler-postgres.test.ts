import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPrismaClient = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: mockGetPrismaClient,
}));

describe("scheduler state postgres backend", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SCHEDULER_STATE_BACKEND = "postgres";
  });

  afterEach(() => {
    delete process.env.SCHEDULER_STATE_BACKEND;
  });

  it("persists and loads due events from postgres tables", async () => {
    const dueEvents = [
      {
        eventId: "2026-04-26-12:agent-1",
        agentId: "agent-1",
        contractId: "C123",
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        dueAt: "2026-04-26T12:00:00.000Z",
        executionMode: "assisted_auto" as const,
      },
    ];

    const prisma = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ events: dueEvents }]),
    };
    mockGetPrismaClient.mockReturnValue(prisma);

    const { saveDueEvents, loadDueEvents } = await import("@/lib/scheduler/state");

    await saveDueEvents("2026-04-26-12", dueEvents);
    const loaded = await loadDueEvents("2026-04-26-12");

    expect(loaded).toEqual(dueEvents);
    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("enforces idempotency via postgres key table", async () => {
    const prisma = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ key: "notify:evt-1" }])
        .mockResolvedValueOnce([]),
    };
    mockGetPrismaClient.mockReturnValue(prisma);

    const { markIdempotentOnce } = await import("@/lib/scheduler/state");

    const first = await markIdempotentOnce({ kind: "notify", eventId: "evt-1" });
    const second = await markIdempotentOnce({ kind: "notify", eventId: "evt-1" });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
