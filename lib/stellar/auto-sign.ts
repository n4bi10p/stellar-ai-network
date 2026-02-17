import * as StellarSdk from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";

/**
 * Sign a Soroban transaction XDR with a raw secret key.
 *
 * NOTE: For production you should:
 * - Store secrets encrypted (e.g. Vercel env + KMS / KV)
 * - Restrict usage to backend/cron contexts only
 * - Consider pre-authorized transactions as a safer alternative
 */
export function signSorobanXdrWithSecret(opts: {
  xdr: string;
  secretKey: string;
}): string {
  const { xdr, secretKey } = opts;

  const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);

  tx.sign(keypair);
  return tx.toXDR();
}

