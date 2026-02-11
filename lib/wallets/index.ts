// ── Wallet Registry ──
// Central list of all supported wallet providers.

import type { WalletProvider, WalletId } from "./types";
import { freighterProvider } from "./freighter";
import { albedoProvider } from "./albedo";
import { rabetProvider } from "./rabet";

/** All supported wallet providers, ordered by display priority */
export const WALLET_PROVIDERS: WalletProvider[] = [
  freighterProvider,
  albedoProvider,
  rabetProvider,
];

/** Lookup a provider by its id */
export function getProvider(id: WalletId): WalletProvider | undefined {
  return WALLET_PROVIDERS.find((p) => p.meta.id === id);
}
