import fs from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addExecutionLog,
  listExecutionLogsByAgent,
  listExecutionLogsForAgents,
} from "@/lib/store/execution-logs";

const logsPath = path.join(process.cwd(), "data", "execution-logs.json");

describe("execution log store", () => {
  beforeEach(async () => {
    process.env.AGENT_STORE_BACKEND = "json";
    delete process.env.DATABASE_URL;
    await fs.mkdir(path.dirname(logsPath), { recursive: true });
    await fs.writeFile(logsPath, "[]", "utf-8");
  });

  afterEach(async () => {
    await fs.writeFile(logsPath, "[]", "utf-8");
  });

  it("records and lists execution logs for a single agent", async () => {
    const created = await addExecutionLog({
      agentId: "agent-1",
      triggerSource: "manual_wallet",
      executionMode: "manual",
      success: true,
      txHash: "tx-123",
      metadata: { amountXlm: 10 },
    });

    expect(created.agentId).toBe("agent-1");
    expect(created.success).toBe(true);

    const logs = await listExecutionLogsByAgent("agent-1");
    expect(logs).toHaveLength(1);
    expect(logs[0].triggerSource).toBe("manual_wallet");
    expect(logs[0].txHash).toBe("tx-123");
    expect(logs[0].metadata?.amountXlm).toBe(10);
  });

  it("filters logs across multiple agents", async () => {
    await addExecutionLog({
      agentId: "agent-1",
      triggerSource: "manual_wallet",
      success: true,
    });
    await addExecutionLog({
      agentId: "agent-2",
      triggerSource: "cron_full_auto",
      success: false,
      failureReason: "Simulation failed",
    });

    const filtered = await listExecutionLogsForAgents(["agent-2"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].agentId).toBe("agent-2");
    expect(filtered[0].failureReason).toBe("Simulation failed");
  });

  it("returns newest logs first", async () => {
    await addExecutionLog({
      agentId: "agent-1",
      triggerSource: "older",
      success: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    await addExecutionLog({
      agentId: "agent-1",
      triggerSource: "newer",
      success: true,
    });

    const logs = await listExecutionLogsByAgent("agent-1");
    expect(logs).toHaveLength(2);
    expect(logs[0].triggerSource).toBe("newer");
    expect(logs[1].triggerSource).toBe("older");
  });
});
