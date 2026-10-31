import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { authenticateBearer } from "@/server/auth";
import { extractForMobile } from "@/server/extraction/service";

/**
 * Mobile extraction endpoint (contract with nebjor/byebills-mobile: keep the
 * URL and response shape stable).
 *
 * Auth: `Authorization: Bearer <supabase access token>`.
 * Quota: enforced server-side via the consume_extraction() RPC (7-day trial,
 * 30 scans/day; pro 200/day). Denied -> 402 {error, reason, used, cap}.
 * The Gemini key stays here, never in the app.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await authenticateBearer(request.headers.get("authorization"));
    const formData = await request.formData();
    const result = await extractForMobile(supabase, formData.get("file") as File | null);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, "mobile-extract");
  }
}
