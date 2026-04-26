// ── Agent store API (adapter-backed) ──
// Uses configured adapter (json/redis) while keeping one stable module API.

import { getAgentsStoreAdapter } from "@/lib/store";
import { getPrismaClient } from "@/lib/db/client";
import type { StoredAgent } from "@/lib/store/types";

export type { StoredAgent } from "@/lib/store/types";

/** Read all agents from configured store */
export async function readAgents(): Promise<StoredAgent[]> {
  const store = await getAgentsStoreAdapter();
  return store.readAll();
}

/** Add a new agent to the store AND to Prisma database */
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
  const store = await getAgentsStoreAdapter();
  await store.writeAll(agents);

  // Also insert into Prisma database for analytics
  try {
    const prisma = getPrismaClient();
    const strategyConfigJson = agent.strategyConfig ? JSON.stringify(agent.strategyConfig) : null;
    const strategyStateJson = agent.strategyState ? JSON.stringify(agent.strategyState) : null;
    const remindersJson = agent.reminders ? JSON.stringify(agent.reminders) : null;
    const fullAutoJson = agent.fullAuto ? JSON.stringify(agent.fullAuto) : null;
    const governanceJson = agent.governance ? JSON.stringify(agent.governance) : null;

    // First, ensure User exists (create or get by wallet address)
    let userId: string | null = null;
    try {
      const userResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "User" WHERE "walletAddress" = ${agent.owner} LIMIT 1
      `;
      if (userResult && userResult.length > 0) {
        userId = userResult[0].id;
      } else {
        // Create new user
        const newUserResult = await prisma.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "User" ("id", "walletAddress", "createdAt") 
          VALUES (gen_random_uuid(), ${agent.owner}, now())
          RETURNING "id"
        `;
        if (newUserResult && newUserResult.length > 0) {
          userId = newUserResult[0].id;
        }
      }
    } catch (userErr) {
      console.warn("[Agents] Error managing User record:", userErr instanceof Error ? userErr.message : String(userErr));
      // Continue without userId, agent can still be created
    }

    // Insert agent into Prisma with userId if available
    await prisma.$executeRaw`
      INSERT INTO "Agent" (
        "id", "userId", "contractId", "owner", "name", "strategy", "templateId", 
        "createdAt", "txHash", "strategyConfig", "strategyState", "autoExecuteEnabled", 
        "executionMode", "reminders", "lastExecutionAt", "nextExecutionAt", 
        "executionCount", "fullAuto", "governance"
      ) VALUES (
        ${newAgent.id}, ${userId || null}::uuid, ${agent.contractId}, ${agent.owner}, ${agent.name}, 
        ${agent.strategy}, ${agent.templateId || null}, now(), ${agent.txHash || null}, 
        ${strategyConfigJson}::jsonb, ${strategyStateJson}::jsonb, 
        ${agent.autoExecuteEnabled || false}, ${agent.executionMode || null}, 
        ${remindersJson}::jsonb, ${agent.lastExecutionAt || null}, 
        ${agent.nextExecutionAt || null}, ${agent.executionCount || null}, 
        ${fullAutoJson}::jsonb, ${governanceJson}::jsonb
      )
    `;
  } catch (err) {
    console.warn("[Agents] Error inserting agent into Prisma:", {
      agentId: newAgent.id,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't throw - agent creation should succeed even if DB insert fails
  }

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
    const store = await getAgentsStoreAdapter();
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
  const store = await getAgentsStoreAdapter();
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
  const store = await getAgentsStoreAdapter();
  await store.writeAll(filtered);
  return true;
}
