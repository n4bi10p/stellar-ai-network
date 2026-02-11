export enum ErrorType {
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  WALLET_CONNECTION_FAILED = "WALLET_CONNECTION_FAILED",
  TRANSACTION_REJECTED = "TRANSACTION_REJECTED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  NETWORK_ERROR = "NETWORK_ERROR",
  AI_PARSE_ERROR = "AI_PARSE_ERROR",
  CONTRACT_ERROR = "CONTRACT_ERROR",
  CONTRACT_NOT_INITIALIZED = "CONTRACT_NOT_INITIALIZED",
  SIMULATION_FAILED = "SIMULATION_FAILED",
  UNKNOWN = "UNKNOWN",
}

export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.WALLET_NOT_FOUND]:
    "Wallet extension not found. Please install the wallet or choose a different provider.",
  [ErrorType.WALLET_CONNECTION_FAILED]:
    "Failed to connect wallet. Please try again.",
  [ErrorType.TRANSACTION_REJECTED]:
    "Transaction was rejected. You may have declined the signature request.",
  [ErrorType.INSUFFICIENT_BALANCE]:
    "Insufficient balance for this transaction.",
  [ErrorType.INVALID_ADDRESS]:
    "Invalid Stellar address. Addresses start with G and are 56 characters.",
  [ErrorType.NETWORK_ERROR]:
    "Network error. Please check your connection and try again.",
  [ErrorType.AI_PARSE_ERROR]:
    "Could not understand your command. Try something like: 'Send 10 XLM to GXXX...'",
  [ErrorType.CONTRACT_ERROR]:
    "Smart contract error. The contract call could not be completed.",
  [ErrorType.CONTRACT_NOT_INITIALIZED]:
    "Agent contract has not been initialized yet. Deploy an agent first.",
  [ErrorType.SIMULATION_FAILED]:
    "Transaction simulation failed. The contract call may have invalid arguments.",
  [ErrorType.UNKNOWN]: "An unknown error occurred.",
};

export function getErrorType(error: unknown): ErrorType {
  const msg =
    error instanceof Error ? error.message : String(error);

  if (msg.includes("not installed") || msg.includes("not found") || msg.includes("Not Found"))
    return ErrorType.WALLET_NOT_FOUND;
  if (msg.includes("User declined") || msg.includes("rejected") || msg.includes("cancelled"))
    return ErrorType.TRANSACTION_REJECTED;
  if (msg.includes("insufficient") || msg.includes("underfunded"))
    return ErrorType.INSUFFICIENT_BALANCE;
  if (msg.includes("invalid") && msg.includes("address"))
    return ErrorType.INVALID_ADDRESS;
  if (msg.includes("NetworkError") || msg.includes("fetch") || msg.includes("ECONNREFUSED"))
    return ErrorType.NETWORK_ERROR;
  if (msg.includes("Simulation failed") || msg.includes("simulation"))
    return ErrorType.SIMULATION_FAILED;
  if (msg.includes("Not initialized") || msg.includes("NotInitialized"))
    return ErrorType.CONTRACT_NOT_INITIALIZED;
  if (msg.includes("contract") || msg.includes("Contract") || msg.includes("Soroban"))
    return ErrorType.CONTRACT_ERROR;

  return ErrorType.UNKNOWN;
}

export function getErrorMessage(error: unknown): string {
  const type = getErrorType(error);
  return ERROR_MESSAGES[type];
}
