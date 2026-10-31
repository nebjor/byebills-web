import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors";
import { checkUpload } from "../uploads";
import { decideQuota, type QuotaRow } from "../quota";
import { getLLMProvider } from "./llm";

/** Validates the upload and returns its base64 + mime type. Throws AppError. */
export async function readUpload(file: File | null, opts: { defaultMime?: string } = {}) {
  const check = checkUpload(file, opts);
  if (!check.ok) throw new AppError(check.status, check.error);
  const bytes = await file!.arrayBuffer();
  return { base64: Buffer.from(bytes).toString("base64"), mimeType: check.mimeType };
}

/** Runs the LLM. Internal failures are logged and surfaced as a generic 500. */
async function runExtraction(base64: string, mimeType: string) {
  try {
    const provider = getLLMProvider();
    const extraction = await provider.extractInvoice(base64, mimeType);
    return { extraction, providerName: provider.name };
  } catch (err) {
    console.error("[extraction] LLM call failed", err);
    throw new AppError(500, "Extraction failed. Please try again.");
  }
}

/** Public demo (shared-password gated, no DB, no quota). */
export async function extractDemo(file: File | null) {
  const { base64, mimeType } = await readUpload(file);
  const { extraction } = await runExtraction(base64, mimeType);
  return { extraction: extraction.data, confidence: extraction.confidence };
}

/**
 * Reserves one scan via consume_extraction() (identity = auth.uid() from the
 * caller's JWT, so it can't be faked). Throws 402 when blocked.
 * `supabase` must be a client scoped to the user's session/JWT.
 */
export async function consumeQuota(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("consume_extraction").single<QuotaRow>();
  if (error) {
    console.error("[quota] consume_extraction failed", error);
    throw new AppError(500, "Internal server error");
  }
  const decision = decideQuota(data);
  if (!decision.allowed) throw new AppError(decision.status, String(decision.body.error), decision.body);
  return decision;
}

async function refundQuota(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("refund_extraction");
  if (error) console.error("[quota] refund_extraction failed", error);
}

/** Validate -> reserve quota -> extract; refunds the scan if we fail. */
async function extractWithQuota(supabase: SupabaseClient, file: File | null, defaultMime?: string) {
  const { base64, mimeType } = await readUpload(file, { defaultMime });
  const quota = await consumeQuota(supabase);
  try {
    const result = await runExtraction(base64, mimeType);
    return { ...result, quota };
  } catch (err) {
    await refundQuota(supabase); // don't charge the user for our failure
    throw err;
  }
}

/** Mobile endpoint: response shape is part of the app contract. */
export async function extractForMobile(supabase: SupabaseClient, file: File | null) {
  const { extraction, quota } = await extractWithQuota(supabase, file, "image/jpeg");
  return {
    extraction: extraction.data,
    confidence: extraction.confidence,
    remaining: quota.remaining,
    cap: quota.cap,
    used: quota.used,
  };
}

/** Stable hash used to detect duplicate documents within one business. */
export function duplicateHashFor(
  businessId: string,
  d: { counterparty?: string | null; amount?: number | null; document_date?: string | null; document_ref?: string | null }
) {
  const input = [businessId, d.counterparty, d.amount, d.document_date, d.document_ref]
    .filter(Boolean)
    .join("|");
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Web endpoint: ownership check, quota, extraction, duplicate lookup. */
export async function extractForWeb(
  supabase: SupabaseClient,
  userId: string,
  file: File | null,
  businessId: string | null
) {
  if (!businessId) throw new AppError(400, "No business_id provided");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!business) throw new AppError(404, "Business not found");

  const { extraction, providerName } = await extractWithQuota(supabase, file);
  const duplicateHash = duplicateHashFor(businessId, extraction.data);

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("business_id", businessId)
    .eq("duplicate_hash", duplicateHash)
    .maybeSingle<{ id: string }>();

  return {
    extraction: extraction.data,
    confidence: extraction.confidence,
    duplicate: existing ? { id: existing.id } : null,
    duplicateHash,
    provider: providerName,
  };
}
