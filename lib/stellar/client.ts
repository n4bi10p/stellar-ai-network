import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE } from "@/lib/utils/constants";

// ── Horizon server singleton ──
let _server: StellarSdk.Horizon.Server | null = null;

export function getServer(): StellarSdk.Horizon.Server {
  if (!_server) {
    _server = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return _server;
}

/** Fetch native XLM balance for an account */
export async function fetchBalance(address: string): Promise<string> {
  const server = getServer();
  const account = await server.loadAccount(address);
  const native = account.balances.find(
    (b) => b.asset_type === "native"
  );
  return native ? native.balance : "0";
}

/** Build a send-XLM transaction XDR (unsigned) */
export async function buildSendXLM(
  source: string,
  destination: string,
  amount: string
): Promise<string> {
  const server = getServer();
  const account = await server.loadAccount(source);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

/** Submit a signed transaction XDR to the network */
export async function submitTransaction(
  signedXDR: string
): Promise<{ hash: string; ledger: number }> {
  const server = getServer();
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    NETWORK_PASSPHRASE
  );
  const result = await server.submitTransaction(tx);

  return {
    hash: result.hash,
    ledger: result.ledger,
  };
}
