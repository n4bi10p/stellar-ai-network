import { PrismaClient } from "@prisma/client";

declare global {
  var __stellarPrisma: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__stellarPrisma) {
    globalThis.__stellarPrisma = new PrismaClient();
  }

  return globalThis.__stellarPrisma;
}
