#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

async function main() {
  requiredEnv("DATABASE_URL");

  const prisma = new PrismaClient();
  const root = process.cwd();
  const jsonPath = path.join(root, "data", "agents.json");

  const raw = await fs.readFile(jsonPath, "utf-8");
  const agents = JSON.parse(raw);
  if (!Array.isArray(agents)) {
    throw new Error(`Expected array in ${jsonPath}`);
  }

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {
        contractId: agent.contractId,
        owner: agent.owner,
        name: agent.name,
        strategy: agent.strategy,
        templateId: agent.templateId ?? null,
        createdAt: new Date(agent.createdAt),
        txHash: agent.txHash ?? null,
        strategyConfig: agent.strategyConfig ?? undefined,
        strategyState: agent.strategyState ?? undefined,
        autoExecuteEnabled: agent.autoExecuteEnabled ?? false,
        executionMode: agent.executionMode ?? "manual",
        reminders: agent.reminders ?? undefined,
        lastExecutionAt: toDateOrNull(agent.lastExecutionAt),
        nextExecutionAt: toDateOrNull(agent.nextExecutionAt),
        executionCount: agent.executionCount ?? 0,
        fullAuto: agent.fullAuto ?? undefined,
      },
      create: {
        id: agent.id,
        contractId: agent.contractId,
        owner: agent.owner,
        name: agent.name,
        strategy: agent.strategy,
        templateId: agent.templateId ?? null,
        createdAt: new Date(agent.createdAt),
        txHash: agent.txHash ?? null,
        strategyConfig: agent.strategyConfig ?? undefined,
        strategyState: agent.strategyState ?? undefined,
        autoExecuteEnabled: agent.autoExecuteEnabled ?? false,
        executionMode: agent.executionMode ?? "manual",
        reminders: agent.reminders ?? undefined,
        lastExecutionAt: toDateOrNull(agent.lastExecutionAt),
        nextExecutionAt: toDateOrNull(agent.nextExecutionAt),
        executionCount: agent.executionCount ?? 0,
        fullAuto: agent.fullAuto ?? undefined,
      },
    });
  }

  await prisma.$disconnect();
  console.log(`Migrated ${agents.length} agents from JSON into Prisma`);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
