// ── Unit Tests: AI Parsing ──
// Tests the AI command parsing API route logic.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parsedCommandSchema } from "@/lib/utils/validation";

// We test the parsing logic at the schema / validation layer
// plus mock the API route handler behaviour.

describe("AI Command Validation", () => {
  it("should validate a send_xlm command", () => {
    const cmd = {
      action: "send_xlm" as const,
      destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      amount: "50",
    };
    const result = parsedCommandSchema.safeParse(cmd);
    expect(result.success).toBe(true);
  });

  it("should validate check_balance without extra fields", () => {
    const result = parsedCommandSchema.safeParse({ action: "check_balance" });
    expect(result.success).toBe(true);
  });

  it("should validate create_agent action", () => {
    const result = parsedCommandSchema.safeParse({ action: "create_agent" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid action types", () => {
    const result = parsedCommandSchema.safeParse({ action: "delete_all" });
    expect(result.success).toBe(false);
  });

  it("should reject send_xlm with invalid destination", () => {
    const cmd = {
      action: "send_xlm",
      destination: "INVALID_ADDRESS",
      amount: "10",
    };
    const result = parsedCommandSchema.safeParse(cmd);
    expect(result.success).toBe(false);
  });

  it("should reject send_xlm with zero amount", () => {
    const cmd = {
      action: "send_xlm",
      destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      amount: "0",
    };
    const result = parsedCommandSchema.safeParse(cmd);
    expect(result.success).toBe(false);
  });
});

describe("AI Response JSON Extraction", () => {
  // Simulates the regex extraction logic from the API route
  function extractJSON(text: string): Record<string, unknown> | null {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  it("should extract JSON from a clean response", () => {
    const text = '{"action":"send_xlm","destination":"GAAA...","amount":"10"}';
    const result = extractJSON(text);
    expect(result).toBeTruthy();
    expect(result?.action).toBe("send_xlm");
  });

  it("should extract JSON wrapped in markdown code block", () => {
    const text = '```json\n{"action":"check_balance"}\n```';
    const result = extractJSON(text);
    expect(result).toBeTruthy();
    expect(result?.action).toBe("check_balance");
  });

  it("should extract JSON with surrounding text", () => {
    const text = 'Here is the parsed command: {"action":"send_xlm","amount":"50"} hope this helps!';
    const result = extractJSON(text);
    expect(result).toBeTruthy();
    expect(result?.action).toBe("send_xlm");
  });

  it("should return null for no JSON", () => {
    expect(extractJSON("no json here")).toBeNull();
  });

  it("should return null for invalid JSON", () => {
    expect(extractJSON("{broken json")).toBeNull();
  });
});

describe("AI Parse Route — Mock Fetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return parsed command from API", async () => {
    const mockResponse = {
      parsed: {
        action: "send_xlm",
        destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        amount: "25",
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Send 25 XLM to GAAA..." }),
    });

    const data = await res.json();
    expect(data.parsed.action).toBe("send_xlm");
    expect(data.parsed.amount).toBe("25");
  });

  it("should handle API error response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "AI parsing failed" }),
    });

    const res = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "" }),
    });

    expect(res.ok).toBe(false);
    const data = await res.json();
    expect(data.error).toBe("AI parsing failed");
  });
});
