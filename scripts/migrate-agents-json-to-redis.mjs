#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function upstashCommand(command) {
  const baseUrl = requiredEnv("UPSTASH_REDIS_REST_URL");
  const token = requiredEnv("UPSTASH_REDIS_REST_TOKEN");
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}

async function main() {
  const key = process.env.AGENTS_STORE_REDIS_KEY || "agents:all";
  const root = process.cwd();
  const jsonPath = path.join(root, "data", "agents.json");

  const raw = await fs.readFile(jsonPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in ${jsonPath}`);
  }

  const payload = JSON.stringify(parsed);
  await upstashCommand(["SET", key, payload]);

  console.log(`Migrated ${parsed.length} agents to Redis key ${key}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
