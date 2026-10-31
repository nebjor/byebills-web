import { z } from "zod";

// Whitelist of fields a client may set when creating a transaction.
// Anything else in the body (user_id, verified, id, created_at, raw_extraction…)
// is silently dropped by zod's default object stripping.

export const PAYMENT_METHODS = ["cash", "bank", "twint", "card", "other"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const text = (max: number) => z.string().trim().max(max);

export const createTransactionSchema = z.object({
  business_id: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  document_type: z.enum(["invoice", "bill"]),
  status: z.enum(["pending", "paid", "unpaid"]).default("pending"),
  counterparty: text(200).nullish(),
  description: text(1000).nullish(),
  amount: z.number().finite().min(-1e12).max(1e12),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("CHF"),
  vat_amount: z.number().finite().min(-1e12).max(1e12).nullish(),
  vat_rate: z.number().finite().min(0).max(100).nullish(),
  // Unknown values are coerced to "other" (previous behaviour of the route).
  payment_method: z
    .preprocess(
      (v) => (typeof v === "string" && !(PAYMENT_METHODS as readonly string[]).includes(v) ? "other" : v),
      z.enum(PAYMENT_METHODS)
    )
    .nullish(),
  document_ref: text(200).nullish(),
  document_date: isoDate.nullish(),
  due_date: isoDate.nullish(),
  duplicate_hash: z.string().regex(/^[a-f0-9]{64}$/).nullish(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export type ParsedTransaction =
  | { ok: true; data: CreateTransactionInput }
  | { ok: false; error: string };

export function parseCreateTransaction(body: unknown): ParsedTransaction {
  const result = createTransactionSchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "body";
    return { ok: false, error: `Invalid ${path}` };
  }
  return { ok: true, data: result.data };
}
