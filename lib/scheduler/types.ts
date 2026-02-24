import type { ExecutionMode } from "@/lib/store/types";

export interface DueEvent {
  eventId: string;
  agentId: string;
  contractId: string;
  owner: string;
  dueAt: string;
  reason?: string;
  nextExecutionAt?: string | null;
  executionMode: ExecutionMode;
}
