export function getPerRunCap(): number {
  const parsed = Number(process.env.CRON_MAX_AGENTS_PER_RUN ?? "25");
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.floor(parsed);
}

export function capItems<T>(items: T[], cap = getPerRunCap()): T[] {
  return items.slice(0, cap);
}
