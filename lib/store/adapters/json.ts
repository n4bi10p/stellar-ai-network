import fs from "fs/promises";
import path from "path";
import type { StoredAgent } from "@/lib/store/types";
import type { AgentsStoreAdapter } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(AGENTS_FILE);
  } catch {
    await fs.writeFile(AGENTS_FILE, "[]", "utf-8");
  }
}

export class JsonAgentsStoreAdapter implements AgentsStoreAdapter {
  kind: "json" = "json";

  async readAll(): Promise<StoredAgent[]> {
    await ensureFile();
    try {
      const raw = await fs.readFile(AGENTS_FILE, "utf-8");
      return JSON.parse(raw) as StoredAgent[];
    } catch {
      return [];
    }
  }

  async writeAll(agents: StoredAgent[]): Promise<void> {
    await ensureFile();
    await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf-8");
  }
}

