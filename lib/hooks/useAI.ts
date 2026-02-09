"use client";

import { useState } from "react";
import type { ParsedCommand } from "@/lib/stellar/types";

export function useAI() {
  const [loading, setLoading] = useState(false);

  async function parseCommand(input: string): Promise<ParsedCommand> {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "AI parsing failed");
      }

      const { parsed } = await res.json();
      return parsed as ParsedCommand;
    } finally {
      setLoading(false);
    }
  }

  return { parseCommand, loading };
}
