// ── Error Monitoring Wrapper — Level 6 Observability ──
// Wraps route handlers and async operations with structured error capture.
// Compatible with Vercel Logs (no external SDK dependency, $0 cost).

import { createLogger } from "@/lib/logging/logger";
import { NextRequest, NextResponse } from "next/server";

const log = createLogger("monitoring");

export interface CapturedError {
  message: string;
  stack?: string;
  component: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

/** Capture and log a structured error event */
export function captureError(
  err: unknown,
  component: string,
  context?: Record<string, unknown>
): CapturedError {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  const entry: CapturedError = {
    message,
    stack,
    component,
    context,
    timestamp: new Date().toISOString(),
  };

  log.error(message, {
    component,
    stack: stack?.split("\n").slice(0, 5).join(" | "),
    ...context,
  });

  return entry;
}

/** Wrap a Next.js route handler with automatic error capture */
export function withErrorCapture<T extends unknown[]>(
  component: string,
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      captureError(err, component);
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/** Wrap any async function with error capture (returns null on failure) */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  component: string,
  context?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    captureError(err, component, context);
    return null;
  }
}

/** Time an async operation and log duration */
export async function timedAsync<T>(
  label: string,
  component: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    log.info(`${label} completed`, { component, durationMs });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    captureError(err, component, { label, durationMs });
    throw err;
  }
}

/** Track a simple named metric increment to stdout */
export function trackMetric(name: string, value: number, tags?: Record<string, string | number>) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      type: "metric",
      name,
      value,
      ...tags,
    })
  );
}

/** Wrap a cron handler — logs start/end/duration and captures errors */
export function withCronMonitoring(
  component: string,
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const start = Date.now();
    log.info("cron started", { component });
    try {
      const result = await handler(request);
      const durationMs = Date.now() - start;
      log.info("cron finished", { component, durationMs, status: result.status });
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      captureError(err, component, { durationMs });
      return NextResponse.json({ error: "Cron handler failed" }, { status: 500 });
    }
  };
}

/** Lightweight route-level request/response logger */
export function withRequestLogging(
  component: string,
  handler: (request: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const start = Date.now();
    const { method } = request;
    const path = new URL(request.url).pathname;

    try {
      const result = await handler(request, ctx);
      log.info(`${method} ${path}`, { component, status: result.status, durationMs: Date.now() - start });
      return result;
    } catch (err) {
      captureError(err, component, { method, path });
      return NextResponse.json({ error: "Request handler failed" }, { status: 500 });
    }
  };
}
