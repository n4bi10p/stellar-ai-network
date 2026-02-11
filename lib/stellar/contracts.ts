// ── Soroban Contract Interactions ──
// Wraps @stellar/stellar-sdk Soroban RPC calls for the AIAgent contract.

import * as StellarSdk from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/utils/constants";

// ── Soroban RPC singleton ──
let _rpc: StellarSdk.rpc.Server | null = null;

function getRpc(): StellarSdk.rpc.Server {
  if (!_rpc) {
    _rpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }
  return _rpc;
}

// ── Helper: convert JS value → ScVal ──
function toScVal(
  value: unknown,
  type: "address" | "string" | "symbol" | "i128"
): StellarSdk.xdr.ScVal {
  switch (type) {
    case "address":
      return new StellarSdk.Address(value as string).toScVal();
    case "string":
      return StellarSdk.nativeToScVal(value as string, { type: "string" });
    case "symbol":
      return StellarSdk.nativeToScVal(value as string, { type: "symbol" });
    case "i128":
      return StellarSdk.nativeToScVal(value as number, { type: "i128" });
    default:
      throw new Error(`Unknown ScVal type: ${type}`);
  }
}

/**
 * Build a Soroban contract invocation transaction (unsigned XDR).
 * The caller is expected to sign it with their wallet and submit via `submitSorobanTx`.
 */
export async function buildContractCall(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourceAddress: string
): Promise<string> {
  const rpc = getRpc();
  const contract = new StellarSdk.Contract(contractId);

  // Load source account
  const account = await rpc.getAccount(sourceAddress);

  // Build transaction with the contract call operation
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate to get correct resource footprint
  const simulated = await rpc.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as StellarSdk.rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  // Assemble the transaction with simulation results
  const assembled = StellarSdk.rpc.assembleTransaction(
    tx,
    simulated
  ).build();

  return assembled.toXDR();
}

/**
 * Submit a signed Soroban transaction and poll until confirmed.
 * Returns the transaction hash + ledger + status.
 */
export async function submitSorobanTx(signedXDR: string): Promise<{
  hash: string;
  ledger: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  resultXdr?: string;
}> {
  const rpc = getRpc();
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    NETWORK_PASSPHRASE
  );

  const sendResult = await rpc.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction send failed: ${sendResult.status}`);
  }

  // Poll for confirmation (up to ~30 seconds)
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

  if (getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
    return {
      hash,
      ledger: getResult.ledger,
      status: "SUCCESS",
      resultXdr: getResult.resultXdr?.toXDR("base64"),
    };
  }

  if (getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
    return {
      hash,
      ledger: getResult.ledger,
      status: "FAILED",
    };
  }

  // Still not found after polling
  return { hash, ledger: 0, status: "PENDING" };
}

// ── High-level contract helpers ──

/** Build `initialize(owner, name, strategy)` call */
export function buildInitialize(
  contractId: string,
  owner: string,
  name: string,
  strategy: string,
  sourceAddress: string
) {
  return buildContractCall(
    contractId,
    "initialize",
    [
      toScVal(owner, "address"),
      toScVal(name, "string"),
      toScVal(strategy, "symbol"),
    ],
    sourceAddress
  );
}

/** Build `execute(recipient, amount)` call */
export function buildExecute(
  contractId: string,
  recipient: string,
  amount: number,
  sourceAddress: string
) {
  return buildContractCall(
    contractId,
    "execute",
    [toScVal(recipient, "address"), toScVal(amount, "i128")],
    sourceAddress
  );
}

/** Build `toggle_active()` call */
export function buildToggleActive(
  contractId: string,
  sourceAddress: string
) {
  return buildContractCall(contractId, "toggle_active", [], sourceAddress);
}

/** Build `get_config()` read-only call and return parsed result */
export async function readConfig(contractId: string): Promise<{
  owner: string;
  name: string;
  strategy: string;
  active: boolean;
  executions: number;
} | null> {
  try {
    const rpc = getRpc();
    const contract = new StellarSdk.Contract(contractId);

    // Use simulateTransaction for read-only calls
    const account = new StellarSdk.Account(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "0"
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_config"))
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      return null;
    }

    const successSim = sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;
    if (!successSim.result) return null;

    const val = StellarSdk.scValToNative(successSim.result.retval);
    return val;
  } catch {
    return null;
  }
}
