import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAgentById = vi.fn();
const recordAgentExecution = vi.fn();
const updateAgent = vi.fn();
const addExecutionLog = vi.fn();
const listExecutionLogsByAgent = vi.fn();
const getAgentsByOwner = vi.fn();
const listExecutionLogsForAgents = vi.fn();

vi.mock("@/lib/store/agents", () => ({
  getAgentById,
  recordAgentExecution,
  updateAgent,
  getAgentsByOwner,
}));

vi.mock("@/lib/store/execution-logs", () => ({
  addExecutionLog,
  listExecutionLogsByAgent,
  listExecutionLogsForAgents,
}));

describe("execution routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists logs for a stored agent", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      name: "AGENT_ONE",
    });
    listExecutionLogsByAgent.mockResolvedValue([
      {
        id: "log-1",
        agentId: "agent-1",
        triggerSource: "manual_wallet",
        success: true,
        createdAt: "2026-03-20T10:00:00.000Z",
      },
    ]);

    const { GET } = await import("@/app/api/agents/[id]/executions/route");
    const response = await GET(
      new NextRequest("http://localhost/api/agents/agent-1/executions"),
      { params: Promise.resolve({ id: "agent-1" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].triggerSource).toBe("manual_wallet");
  });

  it("records a successful execution and updates agent counters", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      name: "AGENT_ONE",
    });
    addExecutionLog.mockResolvedValue({
      id: "log-1",
      agentId: "agent-1",
      triggerSource: "manual_wallet",
      success: true,
      txHash: "tx-1",
      createdAt: "2026-03-20T10:00:00.000Z",
    });

    const { POST } = await import("@/app/api/agents/[id]/executions/route");
    const response = await POST(
      new NextRequest("http://localhost/api/agents/agent-1/executions", {
        method: "POST",
        body: JSON.stringify({
          triggerSource: "manual_wallet",
          executionMode: "manual",
          success: true,
          txHash: "tx-1",
          recordExecution: true,
          nextExecutionAt: null,
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "agent-1" }) }
    );

    expect(response.status).toBe(200);
    expect(addExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        triggerSource: "manual_wallet",
        success: true,
        txHash: "tx-1",
      })
    );
    expect(recordAgentExecution).toHaveBeenCalledTimes(1);
    expect(updateAgent).toHaveBeenCalledWith("agent-1", { txHash: "tx-1" });
  });

  it("returns owner-scoped execution summary", async () => {
    getAgentsByOwner.mockResolvedValue([
      { id: "agent-1", name: "AGENT_ONE", contractId: "C1" },
      { id: "agent-2", name: "AGENT_TWO", contractId: "C2" },
    ]);
    listExecutionLogsForAgents.mockResolvedValue([
      {
        id: "log-2",
        agentId: "agent-2",
        triggerSource: "cron_full_auto",
        success: false,
        createdAt: "2026-03-20T11:00:00.000Z",
      },
      {
        id: "log-1",
        agentId: "agent-1",
        triggerSource: "manual_wallet",
        success: true,
        txHash: "tx-1",
        createdAt: "2026-03-20T10:00:00.000Z",
      },
    ]);

    const { GET } = await import("@/app/api/agents/execution-summary/route");
    const response = await GET(
      new NextRequest("http://localhost/api/agents/execution-summary?owner=GOWNER")
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.summary.total).toBe(2);
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
    expect(data.summary.successRate).toBe(50);
    expect(data.recent[0].agentName).toBe("AGENT_TWO");
    expect(data.recent[1].contractId).toBe("C1");
  });
});
