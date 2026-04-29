// @vitest-environment node
/**
 * Tests for Fee Sponsorship Feature
 * Validates gasless transaction functionality
 */

import { describe, it, expect, vi } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  createFeeBumpTransaction,
  validateSponsorBalance,
  shouldApplySponsorship,
  isFeeBumpTransaction,
  extractFeeBumpInfo,
} from "@/lib/stellar/fee-sponsorship";
import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";

describe("Fee Sponsorship Feature", () => {
  // Fixed test addresses for stable test behavior
  const testDestinationAddress = "GDCR7AHCIURFPTTSPOXBQQC3INWL7OA64KSEOBHPSG24BEEZZFFCLTUB";
  const userSecret = "SCXSNREIX2LNDTGTVE4ARG673DBFH6ZXMYLUEWL4ATYQ7AQAJWDKVEVB";
  const sponsorSecret = "SDYMVZIB7SOS4KZEJJZICWSKMITV6WJTEQYWT7MA74EVERVCTM73VZHO";
  const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);
  const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
  const sponsorPublicKey = sponsorKeypair.publicKey();

  const mockSponsorshipConfig = {
    enabled: true,
    sponsorAddress: sponsorPublicKey,
    maxSpendPerTransaction: 10,
    maxMonthlySpend: 1000,
    monthlySpendUsed: 100,
    lastResetAt: new Date(),
  };


  describe("Fee Bump Transaction Creation", () => {
    it("should create a fee-bump transaction from regular transaction XDR", async () => {
      // Build a simple transaction
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .setTimeout(30)
        .build();

      const originalXdr = tx.toXDR();

      // Create fee-bump
      const feeBumpResult = await createFeeBumpTransaction(
        originalXdr,
        sponsorKeypair.publicKey(),
        sponsorSecret
      );

      // Verify
      expect(feeBumpResult.originalXdr).toBe(originalXdr);
      expect(feeBumpResult.sponsorAddress).toBe(sponsorKeypair.publicKey());
      expect(feeBumpResult.fee).toBeGreaterThan(0);
      expect(feeBumpResult.feeBumpXdr).toBeTruthy();
    });

    it("should calculate correct fee for fee-bump transaction", async () => {
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "50",
          })
        )
        .setTimeout(30)
        .build();

      const originalXdr = tx.toXDR();
      const baseFee = StellarSdk.BASE_FEE;

      const feeBumpResult = await createFeeBumpTransaction(
        originalXdr,
        sponsorKeypair.publicKey(),
        sponsorSecret,
        baseFee
      );

      // Fee should be: baseFee * (operationCount + 1 for fee-bump overhead)
      const expectedFee = baseFee * (2 + 1); // 2 operations + fee-bump overhead
      expect(feeBumpResult.fee).toBe(expectedFee);
    });
  });

  describe("Sponsorship Validation", () => {
    it("should validate sponsor balance is sufficient", async () => {
      const mockRpc = {
        getAccount: vi.fn().mockResolvedValue({
          balances: [
            {
              asset_type: "native",
              balance: "1000", // 1000 XLM
            },
          ],
          sequenceNumber: () => "0",
        }),
      };

      const result = await validateSponsorBalance(
        sponsorKeypair.publicKey(),
        StellarSdk.BASE_FEE * 10,
        mockRpc as any
      );

      expect(result.valid).toBe(true);
      expect(result.balanceStroops).toBeGreaterThan(0);
    });

    it("should reject sponsor with insufficient balance", async () => {
      const mockRpc = {
        getAccount: vi.fn().mockResolvedValue({
          balances: [
            {
              asset_type: "native",
              balance: "0.1", // Only 0.1 XLM
            },
          ],
          sequenceNumber: () => "0",
        }),
      };

      const result = await validateSponsorBalance(
        sponsorKeypair.publicKey(),
        StellarSdk.BASE_FEE * 10,
        mockRpc as any
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Insufficient");
    });

    it("should reject sponsor with no native balance", async () => {
      const mockRpc = {
        getAccount: vi.fn().mockResolvedValue({
          balances: [
            {
              asset_type: "credit_alphanum4",
              asset_code: "USD",
              balance: "1000",
            },
          ],
          sequenceNumber: () => "0",
        }),
      };

      const result = await validateSponsorBalance(
        sponsorPublicKey,
        StellarSdk.BASE_FEE * 10,
        mockRpc as any
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("no native XLM");
    });
  });

  describe("Sponsorship Policy", () => {
    it("should apply sponsorship when enabled and budget available", () => {
      const config = {
        ...mockSponsorshipConfig,
        enabled: true,
        monthlySpendUsed: 500,
        maxMonthlySpend: 1000,
      };

      const result = shouldApplySponsorship(config);
      expect(result.should).toBe(true);
    });

    it("should not apply sponsorship when disabled", () => {
      const config = {
        ...mockSponsorshipConfig,
        enabled: false,
      };

      const result = shouldApplySponsorship(config);
      expect(result.should).toBe(false);
      expect(result.reason).toContain("disabled");
    });

    it("should not apply sponsorship when monthly budget exhausted", () => {
      const config = {
        ...mockSponsorshipConfig,
        enabled: true,
        monthlySpendUsed: 1000,
        maxMonthlySpend: 1000,
      };

      const result = shouldApplySponsorship(config);
      expect(result.should).toBe(false);
      expect(result.reason).toContain("budget exhausted");
    });
  });

  describe("Fee Bump Detection", () => {
    it("should identify fee-bump transaction correctly", async () => {
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .setTimeout(30)
        .build();

      const originalXdr = tx.toXDR();

      // Create fee-bump
      const feeBumpResult = await createFeeBumpTransaction(
        originalXdr,
        sponsorKeypair.publicKey(),
        sponsorSecret
      );

      // Check regular transaction
      expect(isFeeBumpTransaction(originalXdr)).toBe(false);

      // Check fee-bump transaction
      expect(isFeeBumpTransaction(feeBumpResult.feeBumpXdr)).toBe(true);
    });

    it("should extract fee bump information correctly", async () => {
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .setTimeout(30)
        .build();

      const originalXdr = tx.toXDR();

      // Create fee-bump
      const feeBumpResult = await createFeeBumpTransaction(
        originalXdr,
        sponsorKeypair.publicKey(),
        sponsorSecret
      );

      // Extract info
      const info = extractFeeBumpInfo(feeBumpResult.feeBumpXdr);

      expect(info).not.toBeNull();
      expect(info?.sponsorAddress).toBe(sponsorKeypair.publicKey());
      expect(info?.fee).toBe(feeBumpResult.fee);
    });

    it("should return null for non-fee-bump transaction", () => {
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();
      const info = extractFeeBumpInfo(xdr);

      expect(info).toBeNull();
    });
  });

  describe("Integration Tests", () => {
    it("should maintain proper fee structure with sponsorship", async () => {
      // Create original transaction
      const account = new StellarSdk.Account(userKeypair.publicKey(), "0");
      const originalTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: testDestinationAddress,
            asset: StellarSdk.Asset.native(),
            amount: "100",
          })
        )
        .setTimeout(30)
        .build();

      const originalXdr = originalTx.toXDR();
      const originalFee = Number(originalTx.fee);

      // Create fee-bump
      const feeBumpResult = await createFeeBumpTransaction(
        originalXdr,
        sponsorPublicKey,
        sponsorSecret
      );

      // Fee-bump fee should be more than original
      expect(feeBumpResult.fee).toBeGreaterThan(originalFee);

      // Check fee-bump structure is valid
      expect(isFeeBumpTransaction(feeBumpResult.feeBumpXdr)).toBe(true);
    });
  });
});
