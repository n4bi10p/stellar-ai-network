import type { StoredAgent, ExecutionMode } from "@/lib/store/types";

export const EXECUTION_MODES: ExecutionMode[] = [
  "manual",
  "assisted_auto",
  "full_auto",
];

export function resolveExecutionMode(agent: StoredAgent): ExecutionMode {
  if (agent.executionMode) return agent.executionMode;

  // Backward compatibility: legacy flag implied assisted auto unless disabled.
  if (agent.autoExecuteEnabled === false) return "manual";
  return "assisted_auto";
}

export function isReminderEligible(mode: ExecutionMode): boolean {
  const assistedEnabled = (process.env.ENABLE_ASSISTED_AUTO ?? "true") === "true";
  const fullEnabled = (process.env.ENABLE_FULL_AUTO ?? "false") === "true";
  if (mode === "assisted_auto") return assistedEnabled;
  if (mode === "full_auto") return fullEnabled;
  return false;
}

export function isFullAuto(mode: ExecutionMode): boolean {
  return mode === "full_auto";
}
