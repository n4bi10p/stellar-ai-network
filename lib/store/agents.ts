// ── Server-side JSON agent store ──
// Persists deployed agent metadata to data/agents.json.
// Each entry tracks the contract ID, owner, template used, and timestamps.

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

export interface StoredAgent {
  id: string; // unique UUID
  contractId: string;
  owner: string;
  name: string;
  strategy: string;
  templateId: string | null;
  createdAt: string; // ISO 8601
  txHash: string | null;

  /**
   * Strategy-specific config. Stored as plain JSON so it can be migrated to DB later (Level 5).
   * Examples:
   * - recurring_payment: { recipient, amount, intervalSeconds, maxExecutions }
   * - price_alert: { recipient, upperBound, lowerBound, alertAmount, checkIntervalSeconds }
   */
  strategyConfig?: Record<string, unknown>;

  /** Strategy runtime state (timestamps, last price, counters, etc.) */
  strategyState?: Record<string, unknown>;

  /** Auto-execution control (used later by cron in Phase 2) */
  autoExecuteEnabled?: boolean;

  /** Scheduling + telemetry */
  lastExecutionAt?: string | null; // ISO 8601
  nextExecutionAt?: string | null; // ISO 8601
  executionCount?: number; // auto executions performed
}

// Ensure the data directory and file exist
function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AGENTS_FILE)) {
    fs.writeFileSync(AGENTS_FILE, "[]", "utf-8");
  }
}

/** Read all agents from disk */
export function readAgents(): StoredAgent[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(AGENTS_FILE, "utf-8");
    return JSON.parse(raw) as StoredAgent[];
  } catch {
    return [];
  }
}

/** Write agents array to disk */
function writeAgents(agents: StoredAgent[]): void {
  ensureFile();
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf-8");
}

/** Add a new agent to the store */
export function addAgent(agent: Omit<StoredAgent, "id" | "createdAt">): StoredAgent {
  const agents = readAgents();
  const newAgent: StoredAgent = {
    ...agent,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  agents.push(newAgent);
  writeAgents(agents);
  return newAgent;
}

/** Get a single agent by its ID */
export function getAgentById(id: string): StoredAgent | undefined {
  return readAgents().find((a) => a.id === id);
}

/** Get agents filtered by owner address */
export function getAgentsByOwner(owner: string): StoredAgent[] {
  return readAgents().filter((a) => a.owner === owner);
}

/** Update an agent's txHash after deployment */
export function updateAgentTxHash(id: string, txHash: string): void {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx >= 0) {
    agents[idx].txHash = txHash;
    writeAgents(agents);
  }
}

/** Update any stored agent fields (shallow merge). */
export function updateAgent(id: string, patch: Partial<StoredAgent>): StoredAgent | null {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated: StoredAgent = { ...agents[idx], ...patch };
  agents[idx] = updated;
  writeAgents(agents);
  return updated;
}

/** Merge strategy config + state updates. */
export function updateAgentStrategy(
  id: string,
  update: {
    strategyConfig?: Record<string, unknown>;
    strategyState?: Record<string, unknown>;
    autoExecuteEnabled?: boolean;
    nextExecutionAt?: string | null;
  }
): StoredAgent | null {
  const agent = getAgentById(id);
  if (!agent) return null;

  const mergedConfig =
    update.strategyConfig === undefined
      ? agent.strategyConfig
      : { ...(agent.strategyConfig ?? {}), ...update.strategyConfig };

  const mergedState =
    update.strategyState === undefined
      ? agent.strategyState
      : { ...(agent.strategyState ?? {}), ...update.strategyState };

  return updateAgent(id, {
    strategyConfig: mergedConfig,
    strategyState: mergedState,
    autoExecuteEnabled:
      update.autoExecuteEnabled === undefined
        ? agent.autoExecuteEnabled
        : update.autoExecuteEnabled,
    nextExecutionAt:
      update.nextExecutionAt === undefined ? agent.nextExecutionAt ?? null : update.nextExecutionAt,
  });
}

/** Record an execution attempt (success/failure recorded elsewhere). */
export function recordAgentExecution(
  id: string,
  update: { lastExecutionAt: string; nextExecutionAt?: string | null }
): StoredAgent | null {
  const agent = getAgentById(id);
  if (!agent) return null;
  const prev = agent.executionCount ?? 0;
  return updateAgent(id, {
    lastExecutionAt: update.lastExecutionAt,
    nextExecutionAt:
      update.nextExecutionAt === undefined ? agent.nextExecutionAt ?? null : update.nextExecutionAt,
    executionCount: prev + 1,
  });
}

/** Delete an agent by ID */
export function deleteAgent(id: string): boolean {
  const agents = readAgents();
  const filtered = agents.filter((a) => a.id !== id);
  if (filtered.length === agents.length) return false;
  writeAgents(filtered);
  return true;
}
