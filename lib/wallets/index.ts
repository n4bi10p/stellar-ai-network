// ── Wallet Registry ──
// Central list of all supported wallet providers.
// Mobile (iOS/Android): Albedo, XBull
// Desktop: Freighter, Albedo, Rabet

import type { WalletProvider, WalletId, WalletPlatform } from "./types";
import { freighterProvider } from "./freighter";
import { albedoProvider } from "./albedo";
import { rabetProvider } from "./rabet";
import { xbullProvider } from "./xbull";

/** All supported wallet providers */
const ALL_PROVIDERS: WalletProvider[] = [
  freighterProvider,
  albedoProvider,
  rabetProvider,
  xbullProvider,
];

/** Detect platform (mobile vs desktop) */
function detectPlatform(): WalletPlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua) ? "mobile" : "desktop";
}

/**
 * Get wallet providers filtered by platform
 * Mobile: Albedo, XBull (no Freighter)
 * Desktop: All wallets
 */
export function getWalletProviders(platform?: WalletPlatform): WalletProvider[] {
  const p = platform || detectPlatform();

  if (p === "mobile") {
    // Mobile: only Albedo and XBull
    return ALL_PROVIDERS.filter((w) =>
      ["albedo", "xbull"].includes(w.meta.id)
    ).sort((a, b) => {
      // Prioritize XBull for mobile
      if (a.meta.id === "xbull") return -1;
      if (b.meta.id === "xbull") return 1;
      return 0;
    });
  }

  // Desktop: All providers
  return ALL_PROVIDERS.sort((a) => {
    // Prioritize Freighter on desktop
    return a.meta.id === "freighter" ? -1 : 1;
  });
}

/** Get all providers (for backwards compatibility) */
export const WALLET_PROVIDERS: WalletProvider[] = ALL_PROVIDERS;

/** Lookup a provider by its id */
export function getProvider(id: WalletId): WalletProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.meta.id === id);
}
