import type { StoredAgent } from "@/lib/store/types";

export interface AgentsStoreAdapter {
  kind: "json" | "redis";
  readAll(): Promise<StoredAgent[]>;
  writeAll(agents: StoredAgent[]): Promise<void>;
}
