import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/http";
import { track } from "@/server/analytics";
import { extractForWeb } from "@/server/extraction/service";

// Web (cookie-session) extraction. Same per-user quota as the mobile endpoint.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await extractForWeb(
      supabase,
      user.id,
      formData.get("file") as File | null,
      formData.get("business_id") as string | null
    );

    await track(user.id, "receipt_extracted", {
      document_type: result.extraction.document_type,
      transaction_type: result.extraction.type,
      currency: result.extraction.currency,
      confidence: result.confidence,
      provider: result.provider,
      is_duplicate: !!result.duplicate,
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, "extract");
  }
}
