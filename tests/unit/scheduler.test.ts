import fs from "fs/promises";
import path from "path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getHourlyWindow,
  saveDueEvents,
  loadDueEvents,
  markIdempotentOnce,
} from "@/lib/scheduler/state";

describe("scheduler state", () => {
  beforeEach(() => {
    const stateFile = path.join(process.cwd(), "data", ".scheduler-state.test.json");
    process.env.SCHEDULER_STATE_BACKEND = "local";
    process.env.SCHEDULER_STATE_FILE = stateFile;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    return fs.rm(stateFile, { force: true });
  });

  afterEach(() => {
    delete process.env.SCHEDULER_STATE_BACKEND;
    delete process.env.SCHEDULER_STATE_FILE;
  });

  it("builds UTC hourly window key", () => {
    const window = getHourlyWindow(new Date("2026-02-24T13:45:00Z"));
    expect(window).toBe("2026-02-24-13");
  });

  it("stores and loads due events", async () => {
    const window = "2026-02-24-13";
    await saveDueEvents(window, [
      {
        eventId: `${window}:agent-1`,
        agentId: "agent-1",
        contractId: "C123",
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        dueAt: "2026-02-24T13:00:00Z",
        executionMode: "assisted_auto",
      },
    ]);

    const events = await loadDueEvents(window);
    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe("agent-1");
  });

  it("enforces idempotency locally", async () => {
    const first = await markIdempotentOnce({ kind: "notify", eventId: "evt-1", ttlSeconds: 60 });
    const second = await markIdempotentOnce({ kind: "notify", eventId: "evt-1", ttlSeconds: 60 });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
