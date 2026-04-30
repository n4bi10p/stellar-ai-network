import { describe, expect, it, vi } from "vitest";
import { executeAgentOnce } from "@/lib/agents/executor";
import { addAgent } from "@/lib/store/agents";

// Mock the path-payment module to avoid real network calls
vi.mock("@/lib/stellar/path-payment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stellar/path-payment")>();
  return {
    ...actual,
    buildPathPaymentStrictSend: vi.fn().mockResolvedValue({
      xdr: "AAAA_MOCK_XDR_DATA",
      expectedDestAmount: "15.5",
    }),
  };
});

describe("Executor - Swap Integration", () => {
  it("should generate XDR using strategy xdrBuilder for swaps", async () => {
    // 1. Create a swap agent in the store
    const agent = await addAgent({
      owner: "GAAB35I465TZAUN7KMTJXJXXM2SWD6AVB72ZUPLVYGYSZYUJCUV2JO3R",
      name: "INTEGRATION_SWAP_TEST",
      strategy: "swap",
      templateId: "swap",
      contractId: "CAGIKMTM5ZGZZLYDHFI3EOI6GTJX7ODAJN2PW4JXNMNXKOFD5FBTQJKB",
      txHash: "mock_hash",
      autoExecuteEnabled: false,
      strategyConfig: {
        tokenIn: "native",
        tokenOut: "USDC:GBBD47IF6LWK7P7MDEVSCWTTCJM4TRSMWTFSENIQNDNDORC2XIUGGW25",
        amountIn: 10,
        triggerType: "manual"
      }
    });

    // 2. Execute (build only)
    const result = await executeAgentOnce({
      agentId: agent.id,
      sourceAddress: agent.owner,
      submit: false
    });

    // 3. Verify
    expect(result.executed).toBe(false); // executed is false when submit is false
    expect(result.xdr).toBeDefined();
    expect(typeof result.xdr).toBe("string");
    expect(result.xdr).toBe("AAAA_MOCK_XDR_DATA");
  });
});
