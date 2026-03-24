// ── Wallet Registry ──
// Central list of all supported wallet providers.
// Mobile (iOS/Android): Albedo only (web-friendly)
// Desktop: Freighter, Albedo, Rabet, XBull (extension/web-based)

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
 * Mobile: Albedo (web-friendly)
 * Desktop: Freighter, Albedo, Rabet, XBull (extension-based)
 */
export function getWalletProviders(platform?: WalletPlatform): WalletProvider[] {
  const p = platform || detectPlatform();

  if (p === "mobile") {
    // Mobile: only Albedo (XBull is extension/web only, not mobile native)
    return ALL_PROVIDERS.filter((w) =>
      w.meta.id === "albedo"
    );
  }

  // Desktop: All providers (extension/desktop based)
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
