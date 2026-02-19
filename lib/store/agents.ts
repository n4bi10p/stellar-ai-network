// ── Agent store API (adapter-backed) ──
// Uses configured adapter (json/redis) while keeping one stable module API.

import { getAgentsStoreAdapter } from "@/lib/store";
import type { StoredAgent } from "@/lib/store/types";

export type { StoredAgent } from "@/lib/store/types";

/** Read all agents from configured store */
export async function readAgents(): Promise<StoredAgent[]> {
  const store = getAgentsStoreAdapter();
  return store.readAll();
}

/** Add a new agent to the store */
export async function addAgent(
  agent: Omit<StoredAgent, "id" | "createdAt">
): Promise<StoredAgent> {
  const agents = await readAgents();
  const newAgent: StoredAgent = {
    ...agent,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  agents.push(newAgent);
  const store = getAgentsStoreAdapter();
  await store.writeAll(agents);
  return newAgent;
}

/** Get a single agent by its ID */
export async function getAgentById(id: string): Promise<StoredAgent | undefined> {
  const agents = await readAgents();
  return agents.find((a) => a.id === id);
}

/** Get agents filtered by owner address */
export async function getAgentsByOwner(owner: string): Promise<StoredAgent[]> {
  const agents = await readAgents();
  return agents.filter((a) => a.owner === owner);
}

/** Update an agent's txHash after deployment */
export async function updateAgentTxHash(id: string, txHash: string): Promise<void> {
  const agents = await readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx >= 0) {
    agents[idx].txHash = txHash;
    const store = getAgentsStoreAdapter();
    await store.writeAll(agents);
  }
}

/** Update any stored agent fields (shallow merge). */
export async function updateAgent(
  id: string,
  patch: Partial<StoredAgent>
): Promise<StoredAgent | null> {
  const agents = await readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated: StoredAgent = { ...agents[idx], ...patch };
  agents[idx] = updated;
  const store = getAgentsStoreAdapter();
  await store.writeAll(agents);
  return updated;
}

/** Merge strategy config + state updates. */
export async function updateAgentStrategy(
  id: string,
  update: {
    strategyConfig?: Record<string, unknown>;
    strategyState?: Record<string, unknown>;
    autoExecuteEnabled?: boolean;
    nextExecutionAt?: string | null;
  }
): Promise<StoredAgent | null> {
  const agent = await getAgentById(id);
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
      update.nextExecutionAt === undefined
        ? agent.nextExecutionAt ?? null
        : update.nextExecutionAt,
  });
}

/** Record an execution attempt (success/failure recorded elsewhere). */
export async function recordAgentExecution(
  id: string,
  update: { lastExecutionAt: string; nextExecutionAt?: string | null }
): Promise<StoredAgent | null> {
  const agent = await getAgentById(id);
  if (!agent) return null;
  const prev = agent.executionCount ?? 0;
  return updateAgent(id, {
    lastExecutionAt: update.lastExecutionAt,
    nextExecutionAt:
      update.nextExecutionAt === undefined
        ? agent.nextExecutionAt ?? null
        : update.nextExecutionAt,
    executionCount: prev + 1,
  });
}

/** Delete an agent by ID */
export async function deleteAgent(id: string): Promise<boolean> {
  const agents = await readAgents();
  const filtered = agents.filter((a) => a.id !== id);
  if (filtered.length === agents.length) return false;
  const store = getAgentsStoreAdapter();
  await store.writeAll(filtered);
  return true;
}

