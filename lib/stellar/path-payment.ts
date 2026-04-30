import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE } from "@/lib/utils/constants";

let _server: StellarSdk.Horizon.Server | null = null;
export function getServer(): StellarSdk.Horizon.Server {
  if (!_server) {
    _server = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return _server;
}

export function parseAsset(assetString: string): StellarSdk.Asset {
  if (assetString.toLowerCase() === "native" || assetString.toLowerCase() === "xlm") {
    return StellarSdk.Asset.native();
  }
  const parts = assetString.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid asset string format: ${assetString}. Expected CODE:ISSUER or native`);
  }
  return new StellarSdk.Asset(parts[0], parts[1]);
}

export async function buildPathPaymentStrictSend(options: {
  sourceAddress: string;
  sendAsset: string;
  sendAmount: string; // Decimal string
  destAsset: string;
  slippageBps: number; // e.g. 50 for 0.5%
}): Promise<{ xdr: string; expectedDestAmount: string }> {
  const { sourceAddress, sendAsset, sendAmount, destAsset, slippageBps } = options;
  const server = getServer();
  const sourceAsset = parseAsset(sendAsset);
  const destinationAsset = parseAsset(destAsset);

  // Fetch best paths
  const pathReq = await server.strictSendPaths(sourceAsset, sendAmount, [destinationAsset]).call();
  if (pathReq.records.length === 0) {
    throw new Error("No liquidity path found between the specified assets");
  }

  // Sort by destination amount descending
  const sortedPaths = pathReq.records.sort((a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
  const bestPath = sortedPaths[0];

  const expectedAmount = parseFloat(bestPath.destination_amount);
  const slippageFactor = 1 - (slippageBps / 10000);
  const destMin = (expectedAmount * slippageFactor).toFixed(7);

  const account = await server.loadAccount(sourceAddress);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: sourceAsset,
        sendAmount,
        destination: sourceAddress, // Swap to self
        destAsset: destinationAsset,
        destMin,
        path: bestPath.path.map((p: any) => 
          p.asset_type === "native" 
            ? StellarSdk.Asset.native() 
            : new StellarSdk.Asset(p.asset_code, p.asset_issuer)
        ),
      })
    )
    .setTimeout(30)
    .build();

  return { xdr: tx.toXDR(), expectedDestAmount: bestPath.destination_amount };
}
