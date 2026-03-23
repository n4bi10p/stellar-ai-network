// ── Multi-Wallet Provider Interface ──
// Each wallet adapter implements this contract.

export type WalletId = "freighter" | "albedo" | "rabet" | "walletconnect";
export type WalletPlatform = "desktop" | "mobile";
export type WalletConnectionMethod = "extension" | "popup" | "walletconnect";

/** Metadata about a wallet provider (for UI selector) */
export interface WalletMeta {
  id: WalletId;
  name: string;
  /** Short description shown in selector */
  description: string;
  /** URL to install the extension / app */
  installUrl: string;
  /** Heroicon / emoji for HUD display */
  icon: string;
  platforms: WalletPlatform[];
  connectionMethod: WalletConnectionMethod;
  badgeLabel?: string;
}

/** Unified wallet provider interface */
export interface WalletProvider {
  meta: WalletMeta;

  /** Returns true if the extension / app is available in the browser */
  isAvailable(): Promise<boolean>;

  /** Connect and return the public key */
  connect(): Promise<string>;

  /** Sign a Stellar XDR transaction, return signed XDR */
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;

  /** Optional disconnect hook for providers with active sessions */
  disconnect?(): Promise<void>;
}
