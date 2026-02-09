// ── Network Configuration ──
export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

// ── Network passphrase ──
export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

// ── Explorer URLs ──
export const EXPLORER_BASE_URL =
  STELLAR_NETWORK === "mainnet"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";

export function txExplorerUrl(hash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${hash}`;
}

export function accountExplorerUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/account/${address}`;
}

// ── App ──
export const APP_NAME = "Stellar AI Agent Network";
export const APP_VERSION = "2.4.1";
