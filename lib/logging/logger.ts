// ── Structured Logger — Level 6 Observability ──
// JSON-to-stdout logger captured by Vercel Logs.
// All log lines are machine-parseable and include a consistent schema.

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  msg: string;
  component?: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

function emit(entry: LogEntry): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  });

  if (entry.level === "error" || entry.level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Namespaced logger factory — usage: const log = createLogger("cron/auto-execute") */
export function createLogger(component: string) {
  return {
    debug(msg: string, extra?: Record<string, unknown>) {
      if (!IS_PROD) emit({ level: "debug", msg, component, ...extra });
    },
    info(msg: string, extra?: Record<string, unknown>) {
      emit({ level: "info", msg, component, ...extra });
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      emit({ level: "warn", msg, component, ...extra });
    },
    error(msg: string, extra?: Record<string, unknown>) {
      emit({ level: "error", msg, component, ...extra });
    },
  };
}

/** Global default logger */
export const log = createLogger("app");

/** Log an API request (call at entry point of each route handler) */
export function logRequest(component: string, method: string, path: string, extra?: Record<string, unknown>) {
  emit({ level: "info", msg: `${method} ${path}`, component, method, path, ...extra });
}

/** Log a cron run summary */
export function logCronRun(component: string, summary: {
  window?: string;
  processed: number;
  executed?: number;
  failed?: number;
  durationMs?: number;
  [key: string]: unknown;
}) {
  emit({ level: "info", msg: `cron completed`, component, ...summary });
}

/** Log a governance action */
export function logGovernanceEvent(component: string, action: string, agentId: string, owner: string, extra?: Record<string, unknown>) {
  emit({ level: "info", msg: `governance:${action}`, component, action, agentId, owner, ...extra });
}
