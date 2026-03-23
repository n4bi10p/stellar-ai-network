// ── WalletConnect / Stellar Wallets Kit Adapter ──
// Mobile-first provider for compatible Stellar wallet apps.

import { NETWORK_PASSPHRASE } from "@/lib/utils/constants";
import type { WalletProvider, WalletMeta } from "./types";

const meta: WalletMeta = {
  id: "walletconnect",
  name: "Mobile Wallet",
  description: "Connect wallet apps via WalletConnect deep link or QR",
  installUrl: "https://walletconnect.network/wallets",
  icon: "📱",
  platforms: ["desktop", "mobile"],
  connectionMethod: "walletconnect",
  badgeLabel: "BETA",
};

type WalletsKitSdk = typeof import("@creit.tech/stellar-wallets-kit/sdk");
type WalletsKitUtils = typeof import("@creit.tech/stellar-wallets-kit/modules/utils");
type WalletsKitWalletConnect = typeof import("@creit.tech/stellar-wallets-kit/modules/wallet-connect");
type WalletsKitNetwork = import("@creit.tech/stellar-wallets-kit/types").Networks;

let initialized = false;
let connectedAddress = "";

const WALLETCONNECT_TIMEOUT_MS = 35_000;
const WALLETCONNECT_BOOT_TIMEOUT_MS = 5_000;

function getKitNetwork(): WalletsKitNetwork {
  return (NETWORK_PASSPHRASE.includes("Test")
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015") as WalletsKitNetwork;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function withWalletConnectTimeout<T>(
  promise: Promise<T>,
  action: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const suffix = isMobileBrowser()
            ? " Approve the request in your wallet app. If the app did not open, return here and try once more."
            : " If no wallet opened, retry and scan the QR code with a compatible wallet.";
          reject(new Error(`WalletConnect ${action} timed out.${suffix}`));
        }, WALLETCONNECT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function waitForWalletConnectReady(
  StellarWalletsKit: WalletsKitSdk["StellarWalletsKit"]
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < WALLETCONNECT_BOOT_TIMEOUT_MS) {
    const wallets = await StellarWalletsKit.refreshSupportedWallets();
    const walletConnect = wallets.find((wallet) => wallet.id === "wallet_connect");
    if (walletConnect?.isAvailable) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(
    "WalletConnect is still starting up. Please wait a moment and try again."
  );
}

function getProjectId(): string {
  const value = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not configured. Add it to .env.local to enable mobile wallet support."
    );
  }
  return value;
}

async function initKit(): Promise<{ StellarWalletsKit: WalletsKitSdk["StellarWalletsKit"] }> {
  if (typeof window === "undefined") {
    throw new Error("WalletConnect is only available in the browser.");
  }

  const [{ StellarWalletsKit }, { defaultModules }, walletConnect] =
    await Promise.all([
      import("@creit.tech/stellar-wallets-kit/sdk"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
      import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
    ]);

  if (!initialized) {
    const { WalletConnectModule, WalletConnectTargetChain, WALLET_CONNECT_ID } =
      walletConnect as WalletsKitWalletConnect;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || window.location.origin || "http://localhost:3000";

    StellarWalletsKit.init({
      modules: [
        ...defaultModules(),
        new WalletConnectModule({
          projectId: getProjectId(),
          metadata: {
            name: "Stellar AI Network",
            description: "AI-powered autonomous agent infrastructure on Stellar",
            icons: [`${appUrl}/favicon.ico`],
            url: appUrl,
          },
          allowedChains: [
            WalletConnectTargetChain.PUBLIC,
            WalletConnectTargetChain.TESTNET,
          ],
        }),
      ],
      selectedWalletId: WALLET_CONNECT_ID,
      network: getKitNetwork(),
      authModal: {
        showInstallLabel: !isMobileBrowser(),
        hideUnsupportedWallets: false,
      },
    });
    initialized = true;
  }

  return { StellarWalletsKit };
}

export const walletConnectProvider: WalletProvider = {
  meta,

  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
  },

  async connect(): Promise<string> {
    const { StellarWalletsKit } = await initKit();
    StellarWalletsKit.setNetwork(getKitNetwork());
    await waitForWalletConnectReady(StellarWalletsKit);
    const { address } = await withWalletConnectTimeout(
      StellarWalletsKit.authModal(),
      "connection"
    );
    connectedAddress = address;
    return address;
  },

  async signTransaction(
    xdr: string,
    networkPassphrase: string
  ): Promise<string> {
    if (!connectedAddress) {
      throw new Error("No mobile wallet session found. Connect a mobile wallet first.");
    }

    const { StellarWalletsKit } = await initKit();
    const { signedTxXdr } = await withWalletConnectTimeout(
      StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
        address: connectedAddress,
      }),
      "signature request"
    );
    return signedTxXdr;
  },

  async disconnect(): Promise<void> {
    const { StellarWalletsKit } = await initKit();
    await StellarWalletsKit.disconnect();
    connectedAddress = "";
  },
};
