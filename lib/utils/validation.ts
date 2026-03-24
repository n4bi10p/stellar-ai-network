import { z } from "zod";

export const supportedAgentStrategySchema = z.enum([
  "auto_rebalance",
  "recurring_payment",
  "price_alert",
  "dca_bot",
  "savings_sweep",
]);

// Stellar address: starts with G, 56 chars
export const stellarAddressSchema = z
  .string()
  .regex(
    /^G[A-Z2-7]{55}$/,
    "Invalid Stellar address. Must start with G, be 56 characters, and contain only A-Z and 2-7."
  );

// XLM amount: positive number string
export const xlmAmountSchema = z
  .string()
  .refine((v) => {
    const n = parseFloat(v);
    return !Number.isNaN(n) && n > 0;
  }, "Amount must be a positive number");

const positiveNumberSchema = z
  .number()
  .finite("Value must be a valid number")
  .positive("Value must be greater than 0");

const nonNegativeNumberSchema = z
  .number()
  .finite("Value must be a valid number")
  .nonnegative("Value must be 0 or greater");

export const autoRebalanceConfigSchema = z.object({
  recipient: stellarAddressSchema,
  targetRatio: z.number().min(1).max(99),
  checkInterval: positiveNumberSchema,
  thresholdXlm: nonNegativeNumberSchema,
});

export const recurringPaymentConfigSchema = z.object({
  recipient: stellarAddressSchema,
  amount: positiveNumberSchema,
  intervalSeconds: positiveNumberSchema,
  maxExecutions: positiveNumberSchema,
});

export const priceAlertConfigSchema = z
  .object({
    recipient: stellarAddressSchema,
    upperBound: nonNegativeNumberSchema.optional(),
    lowerBound: nonNegativeNumberSchema.optional(),
    alertAmount: positiveNumberSchema,
    checkIntervalSeconds: positiveNumberSchema,
  })
  .superRefine((value, ctx) => {
    if (value.upperBound === undefined && value.lowerBound === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of upperBound or lowerBound is required",
        path: ["upperBound"],
      });
    }

    if (
      value.upperBound !== undefined &&
      value.lowerBound !== undefined &&
      value.lowerBound >= value.upperBound
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lowerBound must be less than upperBound",
        path: ["lowerBound"],
      });
    }
  });

export const dcaBotConfigSchema = z.object({
  recipient: stellarAddressSchema,
  amount: positiveNumberSchema,
  intervalSeconds: positiveNumberSchema,
});

export const savingsSweepConfigSchema = z.object({
  recipient: stellarAddressSchema,
  minBalanceXlm: nonNegativeNumberSchema,
  sweepThresholdXlm: positiveNumberSchema,
  intervalSeconds: positiveNumberSchema,
});

export const strategyConfigSchemas = {
  auto_rebalance: autoRebalanceConfigSchema,
  recurring_payment: recurringPaymentConfigSchema,
  price_alert: priceAlertConfigSchema,
  dca_bot: dcaBotConfigSchema,
  savings_sweep: savingsSweepConfigSchema,
} as const;

export const agentIntentSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    strategy: supportedAgentStrategySchema,
    templateId: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).max(240).optional(),
    missingFields: z.array(z.string().trim().min(1)).default([]),
    strategyConfig: z.record(z.string(), z.unknown()),
  });

// Send transaction input
export const sendTransactionSchema = z.object({
  destination: stellarAddressSchema,
  amount: xlmAmountSchema,
  source: stellarAddressSchema,
});

// AI parsed command
export const parsedCommandSchema = z.object({
  action: z.enum(["send_xlm", "check_balance", "create_agent", "greet"]),
  destination: stellarAddressSchema.optional(),
  amount: xlmAmountSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  agentIntent: agentIntentSchema.nullable().optional(), // Allow null for send_xlm action
});

export type SendTransactionInput = z.infer<typeof sendTransactionSchema>;
export type ParsedCommand = z.infer<typeof parsedCommandSchema>;
export type AgentIntent = z.infer<typeof agentIntentSchema>;
export type SupportedAgentStrategy = z.infer<typeof supportedAgentStrategySchema>;

export function validateStrategyConfig(
  strategy: SupportedAgentStrategy,
  strategyConfig: Record<string, unknown>
) {
  return strategyConfigSchemas[strategy].safeParse(strategyConfig);
}
