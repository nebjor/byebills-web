import { NextRequest, NextResponse } from "next/server";

import { getLLMProvider } from "@/lib/llm";
import { getPostHogClient } from "@/lib/posthog-server";
import { consumeExtraction, quotaDeniedBody, refundExtraction } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";

/**
 * Extraction for the hidden web app (/app).
 *
 * Auth: the browser's Supabase session cookie (same-origin), where the mobile
 * twin at /api/mobile/extract uses a bearer token. Everything else is
 * identical on purpose — same LLM provider, same consume/refund quota, same
 * 402 body — so a scan costs the user exactly one scan whichever device it
 * came from.
 *
 * The Gemini key never leaves the server.
 */
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handle(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  // Reserve before spending. Denied -> 402 with a machine-readable reason.
  const gate = await consumeExtraction(supabase);
  if (!gate.allowed) {
    return NextResponse.json(quotaDeniedBody(gate), { status: 402 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const provider = getLLMProvider();
    const extraction = await provider.extractInvoice(base64, mimeType);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "receipt_extracted",
      properties: {
        surface: "web_app",
        document_type: extraction.data.document_type,
        transaction_type: extraction.data.type,
        currency: extraction.data.currency,
        confidence: extraction.confidence,
        provider: provider.name,
      },
    });
    await posthog.shutdown();

    return NextResponse.json({
      extraction: extraction.data,
      confidence: extraction.confidence,
      remaining: Math.max(0, gate.cap - gate.used),
      cap: gate.cap,
      used: gate.used,
    });
  } catch (err) {
    // Don't charge the user for our failure.
    await refundExtraction(supabase);
    const msg = err instanceof Error ? err.message : "LLM extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
