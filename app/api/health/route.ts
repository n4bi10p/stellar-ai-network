import { NextResponse } from "next/server";
import { clearExpiredCacheEntries, getMemoryCacheSize } from "@/lib/cache/cache";
import { getPrismaClient } from "@/lib/db/client";
import { getSchedulerBackendKind } from "@/lib/scheduler/state";
import { getAgentsStoreAdapter } from "@/lib/store";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("health");

type HealthStatus = "ok" | "degraded" | "error";

type HealthCheck = {
  status: HealthStatus;
  detail: string;
};

export async function GET() {
  const checks: Record<string, HealthCheck> = {
    database: {
      status: "ok",
      detail: "Database check not required for current backend",
    },
    cache: {
      status: "ok",
      detail: "Memory cache check pending",
    },
    store: {
      status: "ok",
      detail: "Store adapter check pending",
    },
    scheduler: {
      status: "ok",
      detail: "Scheduler backend check pending",
    },
  };

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  try {
    clearExpiredCacheEntries();
    checks.cache = {
      status: "ok",
      detail: `Memory cache ready (${getMemoryCacheSize()} active entries)`,
    };
  } catch (error) {
    checks.cache = {
      status: "error",
      detail: error instanceof Error ? error.message : "Cache check failed",
    };
    overallStatus = "unhealthy";
  }

  try {
    if (process.env.DATABASE_URL) {
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "ok",
        detail: "Database reachable",
      };
    }
  } catch (error) {
    checks.database = {
      status: "error",
      detail: error instanceof Error ? error.message : "Database check failed",
    };
    overallStatus = "unhealthy";
  }

  try {
    const store = await getAgentsStoreAdapter();
    await store.readAll();
    checks.store = {
      status: "ok",
      detail: `Agent store reachable via ${store.kind}`,
    };
  } catch (error) {
    checks.store = {
      status: "error",
      detail: error instanceof Error ? error.message : "Agent store check failed",
    };
    overallStatus = "unhealthy";
  }

  try {
    const schedulerBackend = getSchedulerBackendKind();
    checks.scheduler = {
      status: "ok",
      detail: `Scheduler backend resolved to ${schedulerBackend}`,
    };
  } catch (error) {
    checks.scheduler = {
      status: "error",
      detail:
        error instanceof Error ? error.message : "Scheduler backend check failed",
    };
    overallStatus = "unhealthy";
  }

  if (
    overallStatus === "healthy" &&
    (!process.env.DATABASE_URL || getSchedulerBackendKind() === "local")
  ) {
    overallStatus = "degraded";
  }

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  log.info("health check", {
    status: overallStatus,
    database: checks.database.status,
    store: checks.store.status,
    scheduler: checks.scheduler.status,
    cache: checks.cache.status,
    httpStatus,
  });

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}
