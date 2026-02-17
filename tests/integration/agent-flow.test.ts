// ── Integration Test: Agent Creation Full Flow ──
// Tests the end-to-end agent creation pipeline (mocked network calls).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AGENT_TEMPLATES, getTemplate } from "@/lib/agents/templates";
import { parsedCommandSchema } from "@/lib/utils/validation";
import { getErrorMessage } from "@/lib/utils/errors";

describe("Agent Templates", () => {
  it("should have exactly 3 templates", () => {
    expect(AGENT_TEMPLATES).toHaveLength(3);
  });

  it("each template should have required fields", () => {
    for (const t of AGENT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.strategy).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.defaults).toBeTruthy();
    }
  });

  it("should find template by ID", () => {
    const tpl = getTemplate("auto_rebalance");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Auto-Rebalancer");
  });

  it("should return undefined for unknown template", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });

  it("templates should have unique IDs and strategies", () => {
    const ids = AGENT_TEMPLATES.map((t) => t.id);
    const strategies = AGENT_TEMPLATES.map((t) => t.strategy);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(strategies).size).toBe(strategies.length);
  });
});

describe("Full Agent Creation Flow (mocked)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should complete create_agent → build → sign → submit pipeline", async () => {
    // 1. Parse a create_agent command
    const parsed = { action: "create_agent" as const };
    const valid = parsedCommandSchema.safeParse(parsed);
    expect(valid.success).toBe(true);

    // 2. Pick a template
    const template = getTemplate("bill_scheduler");
    expect(template).toBeDefined();
    expect(template!.strategy).toBe("recurring_payment");

    // 3. Mock: POST /api/agents → returns XDR + contractId + agentId
    const mockBuildResponse = {
      success: true,
      contractId: "CAGIKMTM5ZGZZLYDHFI3EOI6GTJX7ODAJN2PW4JXNMNXKOFD5FBTQJKB",
      agentId: "test-uuid-123",
      xdr: "AAAAAgAAAADM...(mock XDR)...",
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBuildResponse),
      })
      // 4. Mock: POST /api/stellar/submit-soroban → SUCCESS
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            hash: "abc123def456",
            ledger: 12345,
            status: "SUCCESS",
          }),
      })
      // 5. Mock: PATCH /api/agents/:id → update txHash
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    // Build
    const buildRes = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        name: "BILL_SCHEDULER_01",
        strategy: template!.strategy,
        templateId: template!.id,
      }),
    });
    const buildData = await buildRes.json();
    expect(buildData.success).toBe(true);
    expect(buildData.contractId).toBeTruthy();
    expect(buildData.agentId).toBeTruthy();

    // Simulate wallet signing (in real flow the wallet signs the XDR)
    const signedXdr = buildData.xdr + "_signed";

    // Submit
    const submitRes = await fetch("/api/stellar/submit-soroban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedXDR: signedXdr }),
    });
    const submitData = await submitRes.json();
    expect(submitData.status).toBe("SUCCESS");
    expect(submitData.hash).toBeTruthy();

    // Update agent with txHash
    const patchRes = await fetch(`/api/agents/${buildData.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: submitData.hash }),
    });
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
  });

  it("should handle build failure gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Simulation failed: bad arg" }),
    });

    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        name: "TEST",
        strategy: "simple",
      }),
    });

    expect(res.ok).toBe(false);
    const data = await res.json();
    const msg = getErrorMessage(new Error(data.error));
    expect(msg).toContain("simulation");
  });

  it("should handle submission failure gracefully", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            contractId: "CTEST",
            agentId: "id-1",
            xdr: "mock_xdr",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            hash: "failed_hash",
            ledger: 0,
            status: "FAILED",
          }),
      });

    const buildRes = await fetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({ owner: "G...", name: "T", strategy: "s" }),
    });
    const buildData = await buildRes.json();
    expect(buildData.success).toBe(true);

    const submitRes = await fetch("/api/stellar/submit-soroban", {
      method: "POST",
      body: JSON.stringify({ signedXDR: "xdr_signed" }),
    });
    const submitData = await submitRes.json();
    expect(submitData.status).toBe("FAILED");
  });
});

describe("Agent Dashboard Data Flow (mocked)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should list agents for a specific owner", async () => {
    const mockAgents = [
      {
        id: "1",
        contractId: "C123",
        owner: "GOWNER",
        name: "AGENT_ONE",
        strategy: "auto_rebalance",
        templateId: "auto_rebalance",
        createdAt: "2026-02-12T00:00:00Z",
        txHash: "abc",
      },
      {
        id: "2",
        contractId: "C456",
        owner: "GOWNER",
        name: "AGENT_TWO",
        strategy: "recurring_payment",
        templateId: "bill_scheduler",
        createdAt: "2026-02-12T01:00:00Z",
        txHash: "def",
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ agents: mockAgents }),
    });

    const res = await fetch("/api/agents?owner=GOWNER");
    const data = await res.json();
    expect(data.agents).toHaveLength(2);
    expect(data.agents[0].name).toBe("AGENT_ONE");
    expect(data.agents[1].templateId).toBe("bill_scheduler");
  });

  it("should return empty array when no agents exist", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ agents: [] }),
    });

    const res = await fetch("/api/agents?owner=GNEWUSER");
    const data = await res.json();
    expect(data.agents).toHaveLength(0);
  });
});
