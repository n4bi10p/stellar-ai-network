import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/client";

export interface ExecutionLogEntry {
  id: string;
  agentId: string;
  triggerSource: string;
  executionMode?: string;
  success: boolean;
  txHash?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NewExecutionLogEntry {
  agentId: string;
  triggerSource: string;
  executionMode?: string;
  success: boolean;
  txHash?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const EXECUTION_LOGS_FILE = path.join(DATA_DIR, "execution-logs.json");

function shouldUsePrisma(): boolean {
  return (
    (process.env.AGENT_STORE_BACKEND || "json").toLowerCase() === "prisma" &&
    Boolean(process.env.DATABASE_URL)
  );
}

async function ensureLogsFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EXECUTION_LOGS_FILE);
  } catch {
    await fs.writeFile(EXECUTION_LOGS_FILE, "[]", "utf-8");
  }
}

async function readJsonLogs(): Promise<ExecutionLogEntry[]> {
  await ensureLogsFile();
  try {
    const raw = await fs.readFile(EXECUTION_LOGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ExecutionLogEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonLogs(logs: ExecutionLogEntry[]): Promise<void> {
  await ensureLogsFile();
  await fs.writeFile(EXECUTION_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

export async function listExecutionLogsByAgent(
  agentId: string
): Promise<ExecutionLogEntry[]> {
  if (shouldUsePrisma()) {
    const prisma = getPrismaClient();
    const logs = await prisma.executionLog.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });

    return logs.map((log) => ({
      id: log.id,
      agentId: log.agentId,
      triggerSource: log.triggerSource,
      executionMode: log.executionMode ?? undefined,
      success: log.success,
      txHash: log.txHash,
      failureReason: log.failureReason,
      metadata:
        (log.metadata as Record<string, unknown> | null | undefined) ?? undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  const logs = await readJsonLogs();
  return logs
    .filter((log) => log.agentId === agentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listExecutionLogsForAgents(
  agentIds: string[]
): Promise<ExecutionLogEntry[]> {
  if (agentIds.length === 0) return [];

  if (shouldUsePrisma()) {
    const prisma = getPrismaClient();
    const logs = await prisma.executionLog.findMany({
      where: { agentId: { in: agentIds } },
      orderBy: { createdAt: "desc" },
    });

    return logs.map((log) => ({
      id: log.id,
      agentId: log.agentId,
      triggerSource: log.triggerSource,
      executionMode: log.executionMode ?? undefined,
      success: log.success,
      txHash: log.txHash,
      failureReason: log.failureReason,
      metadata:
        (log.metadata as Record<string, unknown> | null | undefined) ?? undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  const logs = await readJsonLogs();
  const wanted = new Set(agentIds);
  return logs
    .filter((log) => wanted.has(log.agentId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addExecutionLog(
  input: NewExecutionLogEntry
): Promise<ExecutionLogEntry> {
  const entry: ExecutionLogEntry = {
    id: crypto.randomUUID(),
    agentId: input.agentId,
    triggerSource: input.triggerSource,
    executionMode: input.executionMode,
    success: input.success,
    txHash: input.txHash ?? null,
    failureReason: input.failureReason ?? null,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  if (shouldUsePrisma()) {
    const prisma = getPrismaClient();
    const created = await prisma.executionLog.create({
      data: {
        id: entry.id,
        agentId: entry.agentId,
        triggerSource: entry.triggerSource,
        executionMode: entry.executionMode ?? null,
        success: entry.success,
        txHash: entry.txHash ?? null,
        failureReason: entry.failureReason ?? null,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        createdAt: new Date(entry.createdAt),
      },
    });

    return {
      ...entry,
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    };
  }

  const logs = await readJsonLogs();
  logs.push(entry);
  await writeJsonLogs(logs);
  return entry;
}
