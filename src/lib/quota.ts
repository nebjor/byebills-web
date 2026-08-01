import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, QuotaGateRow } from "@/lib/database.types";

/**
 * Extraction quota — the only thing standing between a signed-up user and an
 * unbounded Gemini bill.
 *
 * The rules live in Postgres (supabase/trial_quota_setup.sql), not here:
 * consume_extraction() reserves one scan atomically for auth.uid(). Because it
 * is SECURITY DEFINER and derives identity from the verified JWT, a client
 * cannot pass someone else's id, reset the counter, or exceed the cap by
 * racing. This module is just the typed call site.
 *
 * Every server path that spends Gemini tokens on behalf of a signed-in user
 * MUST reserve before calling the model, and refund if the model call fails —
 * otherwise our failure costs the user a scan.
 */

export type QuotaGate = QuotaGateRow;

/** Reserve one scan. Throws if the RPC itself errors. */
export async function consumeExtraction(
  supabase: SupabaseClient<Database>,
): Promise<QuotaGate> {
  const { data, error } = await supabase.rpc("consume_extraction").single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("consume_extraction returned no row");
  return data as QuotaGate;
}

/** Give the scan back — call whenever extraction fails after reserving. */
export async function refundExtraction(supabase: SupabaseClient<Database>): Promise<void> {
  try {
    await supabase.rpc("refund_extraction");
  } catch {
    // A failed refund must never mask the original error the caller is handling.
  }
}

/** The 402 body both clients understand (mobile's QuotaError parses this). */
export function quotaDeniedBody(gate: QuotaGate) {
  const daily = gate.reason === "daily_cap";
  return {
    error: daily ? "Daily scan limit reached" : "Free trial ended",
    reason: gate.reason,
    used: gate.used,
    cap: gate.cap,
  };
}
