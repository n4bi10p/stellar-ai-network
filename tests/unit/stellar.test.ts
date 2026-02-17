// ── Unit Tests: Stellar Utility Functions ──
// Tests formatting, validation, and error helpers.

import { describe, it, expect } from "vitest";
import { truncateAddress, formatXLM, timestamp } from "@/lib/utils/formatting";
import {
  stellarAddressSchema,
  xlmAmountSchema,
  sendTransactionSchema,
  parsedCommandSchema,
} from "@/lib/utils/validation";
import { getErrorType, getErrorMessage, ErrorType } from "@/lib/utils/errors";

// ── Formatting ──

describe("truncateAddress", () => {
  it("should truncate a full 56-char Stellar address", () => {
    const addr = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const result = truncateAddress(addr);
    expect(result).toBe("GAAA...AWHF");
    expect(result.length).toBeLessThan(addr.length);
  });

  it("should return short strings unchanged", () => {
    expect(truncateAddress("GABCD")).toBe("GABCD");
    expect(truncateAddress("")).toBe("");
  });

  it("should respect custom char count", () => {
    const addr = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const result = truncateAddress(addr, 6);
    expect(result).toBe("GAAAAA...AAAWHF");
  });
});

describe("formatXLM", () => {
  it("should format a string balance with 2+ decimal places", () => {
    expect(formatXLM("100")).toBe("100.00");
    expect(formatXLM("1234.5678901")).toBe("1,234.5678901");
  });

  it("should format a number balance", () => {
    expect(formatXLM(0)).toBe("0.00");
    expect(formatXLM(999999.99)).toBe("999,999.99");
  });

  it("should return '0.00' for NaN", () => {
    expect(formatXLM("abc")).toBe("0.00");
    expect(formatXLM(NaN)).toBe("0.00");
  });
});

describe("timestamp", () => {
  it("should return a time string in HH:MM:SS format", () => {
    const ts = timestamp();
    expect(ts).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

// ── Validation (Zod Schemas) ──

describe("stellarAddressSchema", () => {
  it("should accept a valid 56-char Stellar address", () => {
    const valid = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(stellarAddressSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject an address that doesn't start with G", () => {
    const bad = "XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(stellarAddressSchema.safeParse(bad).success).toBe(false);
  });

  it("should reject addresses with invalid characters (0, 1, 8, 9)", () => {
    const bad = "GAAB35I465TZAUN7KMT01089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(stellarAddressSchema.safeParse(bad).success).toBe(false);
  });

  it("should reject too-short addresses", () => {
    expect(stellarAddressSchema.safeParse("GABCD").success).toBe(false);
  });
});

describe("xlmAmountSchema", () => {
  it("should accept positive number strings", () => {
    expect(xlmAmountSchema.safeParse("10").success).toBe(true);
    expect(xlmAmountSchema.safeParse("0.001").success).toBe(true);
  });

  it("should reject zero and negative amounts", () => {
    expect(xlmAmountSchema.safeParse("0").success).toBe(false);
    expect(xlmAmountSchema.safeParse("-5").success).toBe(false);
  });

  it("should reject non-numeric strings", () => {
    expect(xlmAmountSchema.safeParse("abc").success).toBe(false);
  });
});

describe("sendTransactionSchema", () => {
  it("should validate a complete send transaction input", () => {
    const input = {
      destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      amount: "10",
      source: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    };
    expect(sendTransactionSchema.safeParse(input).success).toBe(true);
  });

  it("should reject when destination is missing", () => {
    const input = { amount: "10", source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" };
    expect(sendTransactionSchema.safeParse(input).success).toBe(false);
  });
});

describe("parsedCommandSchema", () => {
  it("should accept a valid send_xlm command", () => {
    const cmd = {
      action: "send_xlm",
      destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      amount: "50",
    };
    expect(parsedCommandSchema.safeParse(cmd).success).toBe(true);
  });

  it("should accept a check_balance command without extra fields", () => {
    const cmd = { action: "check_balance" };
    expect(parsedCommandSchema.safeParse(cmd).success).toBe(true);
  });

  it("should reject unknown actions", () => {
    const cmd = { action: "hack_mainnet" };
    expect(parsedCommandSchema.safeParse(cmd).success).toBe(false);
  });
});

// ── Error Handling ──

describe("getErrorType", () => {
  it("should detect WALLET_NOT_FOUND", () => {
    expect(getErrorType(new Error("Freighter not installed"))).toBe(ErrorType.WALLET_NOT_FOUND);
    expect(getErrorType(new Error("Extension not found"))).toBe(ErrorType.WALLET_NOT_FOUND);
  });

  it("should detect TRANSACTION_REJECTED", () => {
    expect(getErrorType(new Error("User declined"))).toBe(ErrorType.TRANSACTION_REJECTED);
    expect(getErrorType(new Error("Signature rejected"))).toBe(ErrorType.TRANSACTION_REJECTED);
  });

  it("should detect INSUFFICIENT_BALANCE", () => {
    expect(getErrorType(new Error("insufficient balance"))).toBe(ErrorType.INSUFFICIENT_BALANCE);
    expect(getErrorType(new Error("Account underfunded"))).toBe(ErrorType.INSUFFICIENT_BALANCE);
  });

  it("should detect SIMULATION_FAILED", () => {
    expect(getErrorType(new Error("Simulation failed: bad arg"))).toBe(ErrorType.SIMULATION_FAILED);
  });

  it("should detect CONTRACT_NOT_INITIALIZED", () => {
    expect(getErrorType(new Error("NotInitialized"))).toBe(ErrorType.CONTRACT_NOT_INITIALIZED);
  });

  it("should fall back to UNKNOWN", () => {
    expect(getErrorType(new Error("something random"))).toBe(ErrorType.UNKNOWN);
    expect(getErrorType("just a string")).toBe(ErrorType.UNKNOWN);
  });
});

describe("getErrorMessage", () => {
  it("should return a human-readable message for known errors", () => {
    const msg = getErrorMessage(new Error("User declined"));
    expect(msg).toContain("rejected");
    expect(msg).toContain("signature");
  });

  it("should return the UNKNOWN message for unrecognized errors", () => {
    const msg = getErrorMessage(new Error("xyz"));
    expect(msg).toBe("An unknown error occurred.");
  });
});
