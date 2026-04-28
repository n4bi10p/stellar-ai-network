import { NextResponse } from "next/server";
import { getSchedulerBackendKind } from "@/lib/scheduler/state";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * GET /api/cron/health
 *
 * Diagnostic endpoint — reports which storage backends are configured.
 * Hit this first when debugging cron 500 errors.
 *
 * Returns 200 even when misconfigured so curl doesn't abort before printing.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = {
    DATABASE_URL:              Boolean(process.env.DATABASE_URL),
    CRON_SECRET:               Boolean(process.env.CRON_SECRET),
    UPSTASH_REDIS_REST_URL:    Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN:  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    ENABLE_FULL_AUTO:          process.env.ENABLE_FULL_AUTO ?? "unset",
    NODE_ENV:                  process.env.NODE_ENV ?? "unset",
  };

  let schedulerBackend: string;
  let schedulerError: string | null = null;
  try {
    schedulerBackend = getSchedulerBackendKind();
  } catch (err) {
    schedulerBackend = "error";
    schedulerError = err instanceof Error ? err.message : String(err);
  }

  let agentStoreBackend: string;
  let agentStoreError: string | null = null;
  try {
    const { getAgentsStoreAdapter } = await import("@/lib/store");
    const adapter = await getAgentsStoreAdapter();
    agentStoreBackend = adapter.constructor.name;
  } catch (err) {
    agentStoreBackend = "error";
    agentStoreError = err instanceof Error ? err.message : String(err);
  }

  const healthy =
    checks.DATABASE_URL &&
    checks.CRON_SECRET &&
    schedulerBackend !== "error" &&
    agentStoreBackend !== "error";

  return NextResponse.json(
    {
      ok: healthy,
      timestamp: new Date().toISOString(),
      env: checks,
      schedulerBackend,
      schedulerError,
      agentStoreBackend,
      agentStoreError,
    },
    { status: 200 } // always 200 so CI can read the body
  );
}
