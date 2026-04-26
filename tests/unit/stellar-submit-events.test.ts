import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitTransaction = vi.fn();
const submitSorobanTx = vi.fn();
const saveExecutionEvent = vi.fn();

vi.mock("@/lib/stellar/client", () => ({
  submitTransaction,
}));

vi.mock("@/lib/stellar/contracts", () => ({
  submitSorobanTx,
}));

vi.mock("@/lib/store/analytics", () => ({
  saveExecutionEvent,
}));

describe("stellar submit analytics events", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    saveExecutionEvent.mockResolvedValue(undefined);
  });

  it("records manual transfer with nullable agentId", async () => {
    submitTransaction.mockResolvedValue({ hash: "tx-manual", ledger: 123 });

    const { POST } = await import("@/app/api/stellar/submit/route");
    const response = await POST(
      new NextRequest("http://localhost/api/stellar/submit", {
        method: "POST",
        body: JSON.stringify({
          signedXDR: "AAAA",
          walletAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(saveExecutionEvent).toHaveBeenCalledWith(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      null,
      "success",
      "tx-manual",
      undefined,
      expect.objectContaining({ transactionType: "manual_transfer" })
    );
  });

  it("records agent execution with agent id", async () => {
    submitTransaction.mockResolvedValue({ hash: "tx-agent", ledger: 124 });

    const { POST } = await import("@/app/api/stellar/submit/route");
    const response = await POST(
      new NextRequest("http://localhost/api/stellar/submit", {
        method: "POST",
        body: JSON.stringify({
          signedXDR: "BBBB",
          walletAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
          agentId: "agent-123",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(saveExecutionEvent).toHaveBeenCalledWith(
      "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "agent-123",
      "success",
      "tx-agent",
      undefined,
      expect.objectContaining({ transactionType: "agent_execution" })
    );
  });

  it("records manual soroban submit with nullable agentId", async () => {
    submitSorobanTx.mockResolvedValue({
      status: "SUCCESS",
      hash: "tx-soroban",
      ledger: 125,
    });

    const { POST } = await import("@/app/api/stellar/submit-soroban/route");
    const response = await POST(
      new NextRequest("http://localhost/api/stellar/submit-soroban", {
        method: "POST",
        body: JSON.stringify({
          signedXDR: "CCCC",
          walletAddress: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(saveExecutionEvent).toHaveBeenCalledWith(
      "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      null,
      "success",
      "tx-soroban",
      undefined,
      expect.objectContaining({ transactionType: "manual_soroban" })
    );
  });
});
