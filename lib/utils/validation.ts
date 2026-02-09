import { z } from "zod";

// Stellar address: starts with G, 56 chars
export const stellarAddressSchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar address");

// XLM amount: positive number string
export const xlmAmountSchema = z
  .string()
  .refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, "Amount must be a positive number");

// Send transaction input
export const sendTransactionSchema = z.object({
  destination: stellarAddressSchema,
  amount: xlmAmountSchema,
  source: stellarAddressSchema,
});

// AI parsed command
export const parsedCommandSchema = z.object({
  action: z.enum(["send_xlm", "check_balance", "create_agent"]),
  destination: stellarAddressSchema.optional(),
  amount: xlmAmountSchema.optional(),
});

export type SendTransactionInput = z.infer<typeof sendTransactionSchema>;
export type ParsedCommand = z.infer<typeof parsedCommandSchema>;
