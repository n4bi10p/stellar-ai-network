function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("timeout") ||
    message.includes("tempor") ||
    message.includes("network") ||
    message.includes("econnreset")
  );
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseMs?: number; maxMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 2;
  const baseMs = options?.baseMs ?? 250;
  const maxMs = options?.maxMs ?? 2000;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransientError(err)) {
        throw err;
      }
      const backoff = Math.min(maxMs, baseMs * 2 ** attempt);
      attempt += 1;
      await sleep(backoff);
    }
  }
}
