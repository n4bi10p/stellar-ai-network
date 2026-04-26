// ── Workflow Orchestrator Types ──
// Multi-agent workflow chains — Level 6 Advanced Feature

export type WorkflowTriggerCondition =
  | "always"        // always run next step
  | "on_success"    // only if previous step executed successfully  
  | "on_failure"    // only if previous step failed
  | "on_condition"; // custom condition on output value

export type WorkflowStatus = "active" | "paused" | "completed" | "archived";
export type WorkflowRunStatus = "running" | "completed" | "failed" | "partial";
export type StepRunStatus = "pending" | "skipped" | "running" | "success" | "failed" | "dry_run";

export interface WorkflowConditionRule {
  /** Field from previous step output to inspect */
  field: "executed" | "amountXlm" | "txHash" | "successRate";
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value: unknown;
}

export interface WorkflowStep {
  /** Stable step identifier within the workflow */
  stepId: string;
  /** Display name */
  name: string;
  /** ID of the agent to execute */
  agentId: string;
  /** When to execute this step relative to the previous */
  triggerCondition: WorkflowTriggerCondition;
  /** Custom condition rule (when triggerCondition === 'on_condition') */
  conditionRule?: WorkflowConditionRule;
  /** Optional delay before this step fires (seconds) */
  delaySeconds?: number;
  /** Pass the previous step's context (txHash, amountXlm) into this execution */
  passContext?: boolean;
  /** Human-readable description of what this step does */
  description?: string;
}

export interface WorkflowDefinition {
  id: string;
  owner: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  runCount: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Context passed between steps */
export interface StepContext {
  stepIndex: number;
  stepId: string;
  /** Output from the previous step */
  previousOutput?: StepRunResult | null;
}

export interface StepRunResult {
  stepId: string;
  stepIndex: number;
  agentId: string;
  agentName: string;
  status: StepRunStatus;
  executed: boolean;
  txHash?: string | null;
  amountXlm?: number;
  reason?: string;
  error?: string;
  skippedReason?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  steps: StepRunResult[];
  triggerSource: "manual" | "cron" | "api";
  startedAt: string;
  completedAt?: string | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
}
