import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors";
import type { CreateTransactionInput } from "./schema";

/**
 * Inserts a verified transaction for `userId`.
 * - The caller identity comes from the session, never from the body.
 * - business_id ownership is checked here (explicit user_id filter) instead of
 *   relying on RLS policies that are not versioned in this repo.
 * - `verified` is always set server-side.
 */
export async function createTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTransactionInput
) {
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", input.business_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!business) throw new AppError(404, "Business not found");

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({ ...input, verified: true })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new AppError(409, "Duplicate transaction");
    console.error("[transactions] insert failed", error);
    throw new AppError(500, "Could not save transaction");
  }
  return transaction;
}
