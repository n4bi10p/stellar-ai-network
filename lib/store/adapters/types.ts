import type { StoredAgent } from "@/lib/store/types";

export interface AgentsStoreAdapter {
  kind: "json" | "redis" | "prisma";
  readAll(): Promise<StoredAgent[]>;
  writeAll(agents: StoredAgent[]): Promise<void>;
}
