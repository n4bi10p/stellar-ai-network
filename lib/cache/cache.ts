type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

declare global {
  var __stellarMemoryCache:
    | Map<string, CacheEntry<unknown>>
    | undefined;
}

const cacheStore = globalThis.__stellarMemoryCache ?? new Map<string, CacheEntry<unknown>>();

if (!globalThis.__stellarMemoryCache) {
  globalThis.__stellarMemoryCache = cacheStore;
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  return entry.expiresAt <= Date.now();
}

export function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): T {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return value;
}

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (isExpired(entry)) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function withCached<T>(
  key: string,
  load: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const fresh = await load();
  return setCached(key, fresh, ttlSeconds);
}

export function clearExpiredCacheEntries(): void {
  for (const [key, entry] of cacheStore.entries()) {
    if (isExpired(entry)) {
      cacheStore.delete(key);
    }
  }
}

export function deleteCached(key: string): boolean {
  return cacheStore.delete(key);
}

export function deleteCachedByPrefix(prefix: string): number {
  let removed = 0;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
      removed += 1;
    }
  }

  return removed;
}

export function getMemoryCacheSize(): number {
  clearExpiredCacheEntries();
  return cacheStore.size;
}

export function clearMemoryCache(): void {
  cacheStore.clear();
}
