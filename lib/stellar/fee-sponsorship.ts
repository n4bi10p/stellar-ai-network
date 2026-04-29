/**
 * Fee Sponsorship Module
 *
 * Implements gasless transactions for AI agents by using fee-bump transactions.
 * A sponsor account covers the transaction fees while users retain operational control.
 *
 * Key Features:
 * - Sponsor account covers all transaction fees
 * - Agent executions become "free" for end users
 * - Configurable per-agent sponsorship settings
 * - Spending limits on sponsorship
 * - Audit trail of all sponsored transactions
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from "@/lib/utils/constants";

export interface SponsorshipConfig {
  enabled: boolean;
  sponsorAddress: string;
  maxSpendPerTransaction: number; // In XLM
  maxMonthlySpend: number; // In XLM
  monthlySpendUsed: number; // In XLM
  lastResetAt: Date;
}

export interface FeeBumpResult {
  originalXdr: string;
  feeBumpXdr: string;
  sponsorAddress: string;
  fee: number; // in stroops
  baseFee: number; // in stroops per operation
}

interface AccountBalance {
  asset_type: string;
  balance: string;
}

function getAccountBalances(account: unknown): AccountBalance[] {
  if (!account || typeof account !== "object" || !("balances" in account)) {
    return [];
  }

  const balances = (account as { balances?: unknown }).balances;
  if (!Array.isArray(balances)) {
    return [];
  }

  return balances.filter(
    (balance): balance is AccountBalance =>
      !!balance &&
      typeof balance === "object" &&
      (balance as { asset_type?: unknown }).asset_type === "native" &&
      typeof (balance as { balance?: unknown }).balance === "string"
  );
}

function getFeeSpentStroops(
  result: StellarSdk.rpc.Api.GetTransactionResponse
): number | undefined {
  if (!("feeBump" in result)) {
    return undefined;
  }

  const feeBump = result.feeBump;
  if (!feeBump || typeof feeBump !== "object" || !("feeSpent" in feeBump)) {
    return undefined;
  }

  const feeSpent = (feeBump as Record<string, unknown>).feeSpent;
  if (typeof feeSpent === "number") {
    return feeSpent;
  }

  if (typeof feeSpent === "string") {
    const parsed = Number(feeSpent);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

/**
 * Validate sponsor account has sufficient balance for fee coverage
 */
export async function validateSponsorBalance(
  sponsorAddress: string,
  requiredFeeStroops: number,
  rpc: StellarSdk.rpc.Server
): Promise<{ valid: boolean; balanceStroops: number; reason?: string }> {
  try {
    const account = await rpc.getAccount(sponsorAddress);

    // Find native XLM balance
    const nativeBalance = getAccountBalances(account).find(
      (b) => b.asset_type === "native"
    );
    if (!nativeBalance) {
      return {
        valid: false,
        balanceStroops: 0,
        reason: "Sponsor account has no native XLM balance",
      };
    }

    const balanceStroops = Math.round(parseFloat(nativeBalance.balance) * 10_000_000);

    // Add buffer for base reserve + operational fees
    const baseReserveStroops = 50_000_000; // 5 XLM base reserve
    const minRequired = requiredFeeStroops + baseReserveStroops;

    if (balanceStroops < minRequired) {
      return {
        valid: false,
        balanceStroops,
        reason: `Insufficient balance. Required: ${minRequired / 10_000_000} XLM, Available: ${balanceStroops / 10_000_000} XLM`,
      };
    }

    return { valid: true, balanceStroops };
  } catch (error) {
    return {
      valid: false,
      balanceStroops: 0,
      reason: `Failed to validate sponsor balance: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a fee-bump transaction from an existing transaction XDR
 *
 * Fee-bump transactions allow a different account (sponsor) to pay fees
 * while the original signer retains operational control.
 */
export async function createFeeBumpTransaction(
  originalXdr: string,
  sponsorAddress: string,
  sponsorSecretKey: string,
  baseFeePerOp: number = Number(StellarSdk.BASE_FEE)
): Promise<FeeBumpResult> {
  // Deserialize original transaction
  const originalTx = StellarSdk.TransactionBuilder.fromXDR(
    originalXdr,
    NETWORK_PASSPHRASE
  );

  if (originalTx instanceof StellarSdk.FeeBumpTransaction) {
    throw new Error("Cannot create fee-bump transaction from fee-bump XDR");
  }

  // Calculate fee for fee-bump (inner + sponsor operation overhead)
  const operationCount = originalTx.operations.length;
  const feeBumpFeeStroops = baseFeePerOp * (operationCount + 1); // +1 for fee-bump overhead

  // Create fee-bump transaction using SDK helper
  const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    sponsorAddress,
    String(baseFeePerOp),
    originalTx,
    NETWORK_PASSPHRASE
  );

  // Sign with sponsor key
  const sponsorKeyPair = StellarSdk.Keypair.fromSecret(sponsorSecretKey);
  feeBumpTx.sign(sponsorKeyPair);

  return {
    originalXdr,
    feeBumpXdr: feeBumpTx.toXDR(),
    sponsorAddress,
    fee: feeBumpFeeStroops,
    baseFee: baseFeePerOp,
  };
}

/**
 * Submit a fee-bump transaction to Soroban RPC
 */
export async function submitFeeBumpTransaction(
  feeBumpXdr: string,
  rpc: StellarSdk.rpc.Server
): Promise<{
  hash: string;
  ledger: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  sponsorFeeSpent: number; // in stroops
}> {
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      feeBumpXdr,
      NETWORK_PASSPHRASE
    );

    // Send transaction
    const sendResult = await rpc.sendTransaction(tx);

    if (sendResult.status === "ERROR") {
      throw new Error(`Transaction send failed: ${sendResult.errorResult}`);
    }

    // Poll for confirmation
    const hash = sendResult.hash;
    let getResult: StellarSdk.rpc.Api.GetTransactionResponse;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    do {
      await new Promise((r) => setTimeout(r, 1000));
      getResult = await rpc.getTransaction(hash);
      attempts++;
    } while (
      getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < MAX_ATTEMPTS
    );

    // Extract fee from result
    let sponsorFeeSpent = 0;
    if (
      getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS ||
      getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED
    ) {
      sponsorFeeSpent = getFeeSpentStroops(getResult) ?? 0;
    }

    const status =
      getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS
        ? "SUCCESS"
        : getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED
          ? "FAILED"
          : "PENDING";

    return {
      hash,
      ledger: "ledger" in getResult ? getResult.ledger : 0,
      status,
      sponsorFeeSpent,
    };
  } catch (error) {
    throw new Error(
      `Failed to submit fee-bump transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if sponsorship should be applied based on config and spending limits
 */
export function shouldApplySponsorship(
  config: SponsorshipConfig
): { should: boolean; reason?: string } {
  if (!config.enabled) {
    return { should: false, reason: "Sponsorship disabled" };
  }

  // Check monthly spending limit
  if (config.monthlySpendUsed >= config.maxMonthlySpend) {
    return {
      should: false,
      reason: "Monthly sponsorship budget exhausted",
    };
  }

  return { should: true };
}

/**
 * Build a sponsored transaction XDR
 *
 * This is a convenience function that wraps the original transaction building
 * and applies fee-bump sponsorship.
 */
export async function buildSponsoredTransaction(
  buildOriginalTxFn: () => Promise<string>,
  sponsorConfig: SponsorshipConfig,
  sponsorSecretKey: string,
  rpc: StellarSdk.rpc.Server
): Promise<{ xdr: string; sponsored: boolean; sponsorFee?: number }> {
  // Check if sponsorship is available
  const sponsorshipCheck = shouldApplySponsorship(sponsorConfig);
  if (!sponsorshipCheck.should) {
    return {
      xdr: await buildOriginalTxFn(),
      sponsored: false,
    };
  }

  // Build original transaction
  const originalXdr = await buildOriginalTxFn();

  try {
    // Validate sponsor has balance
    const balanceCheck = await validateSponsorBalance(
      sponsorConfig.sponsorAddress,
      Number(StellarSdk.BASE_FEE) * 2, // Estimate for fee-bump overhead
      rpc
    );

    if (!balanceCheck.valid) {
      console.warn(`Sponsorship not available: ${balanceCheck.reason}`);
      return {
        xdr: originalXdr,
        sponsored: false,
      };
    }

    // Create fee-bump
    const feeBumpResult = await createFeeBumpTransaction(
      originalXdr,
      sponsorConfig.sponsorAddress,
      sponsorSecretKey
    );

    return {
      xdr: feeBumpResult.feeBumpXdr,
      sponsored: true,
      sponsorFee: feeBumpResult.fee,
    };
  } catch (error) {
    console.warn(
      `Failed to apply sponsorship: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      xdr: originalXdr,
      sponsored: false,
    };
  }
}

/**
 * Extract fee information from a fee-bump transaction
 */
export function extractFeeBumpInfo(feeBumpXdr: string): {
  sponsorAddress: string;
  fee: number;
  innerHash?: string;
} | null {
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      feeBumpXdr,
      NETWORK_PASSPHRASE
    );

    if (tx instanceof StellarSdk.FeeBumpTransaction) {
      return {
        sponsorAddress: tx.feeSource,
        fee: Number(tx.fee),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a transaction XDR is a fee-bump transaction
 */
export function isFeeBumpTransaction(xdr: string): boolean {
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      NETWORK_PASSPHRASE
    );
    return tx instanceof StellarSdk.FeeBumpTransaction;
  } catch {
    return false;
  }
}
