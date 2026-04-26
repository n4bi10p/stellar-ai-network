import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import type { StoredAgent } from "@/lib/store/types";
import type { AgentsStoreAdapter } from "./types";

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toDateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function toJsonValue(
  value:
    | Record<string, unknown>
    | StoredAgent["reminders"]
    | StoredAgent["fullAuto"]
    | StoredAgent["governance"]
    | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

function mapRecordToStoredAgent(record: {
  id: string;
  contractId: string;
  owner: string;
  name: string;
  strategy: string;
  templateId: string | null;
  createdAt: Date;
  txHash: string | null;
  strategyConfig: unknown;
  strategyState: unknown;
  autoExecuteEnabled: boolean | null;
  executionMode: string | null;
  reminders: unknown;
  lastExecutionAt: Date | null;
  nextExecutionAt: Date | null;
  executionCount: number | null;
  fullAuto: unknown;
  governance: unknown;
}): StoredAgent {
  return {
    id: record.id,
    contractId: record.contractId,
    owner: record.owner,
    name: record.name,
    strategy: record.strategy,
    templateId: record.templateId,
    createdAt: record.createdAt.toISOString(),
    txHash: record.txHash,
    strategyConfig: (record.strategyConfig as Record<string, unknown> | null) ?? undefined,
    strategyState: (record.strategyState as Record<string, unknown> | null) ?? undefined,
    autoExecuteEnabled: record.autoExecuteEnabled ?? undefined,
    executionMode: (record.executionMode as StoredAgent["executionMode"] | null) ?? undefined,
    reminders: (record.reminders as StoredAgent["reminders"] | null) ?? undefined,
    lastExecutionAt: toIsoOrNull(record.lastExecutionAt) ?? undefined,
    nextExecutionAt: toIsoOrNull(record.nextExecutionAt) ?? undefined,
    executionCount: record.executionCount ?? undefined,
    fullAuto: (record.fullAuto as StoredAgent["fullAuto"] | null) ?? undefined,
    governance:
      (record.governance as StoredAgent["governance"] | null) ?? undefined,
  };
}

function mapStoredAgentToRecord(agent: StoredAgent) {
  return {
    id: agent.id,
    contractId: agent.contractId,
    owner: agent.owner,
    name: agent.name,
    strategy: agent.strategy,
    templateId: agent.templateId ?? null,
    createdAt: new Date(agent.createdAt),
    txHash: agent.txHash ?? null,
    strategyConfig: toJsonValue(agent.strategyConfig),
    strategyState: toJsonValue(agent.strategyState),
    autoExecuteEnabled: agent.autoExecuteEnabled ?? false,
    executionMode: agent.executionMode ?? "manual",
    reminders: toJsonValue(agent.reminders),
    lastExecutionAt: toDateOrNull(agent.lastExecutionAt),
    nextExecutionAt: toDateOrNull(agent.nextExecutionAt),
    executionCount: agent.executionCount ?? 0,
    fullAuto: toJsonValue(agent.fullAuto),
    governance: toJsonValue(agent.governance),
  };
}

export class PrismaAgentsStoreAdapter implements AgentsStoreAdapter {
  kind: "prisma" = "prisma";

  async readAll(): Promise<StoredAgent[]> {
    const prisma = getPrismaClient();
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "asc" },
    });
    return agents.map(mapRecordToStoredAgent);
  }

  async writeAll(agents: StoredAgent[]): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction(async (tx) => {
      await tx.agent.deleteMany();

      for (const agent of agents) {
        await tx.agent.create({
          data: mapStoredAgentToRecord(agent),
        });
      }
    });
  }
}
