import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider } from "@/lib/llm";
import { createServiceClient } from "@/lib/supabase/service";

// Public demo extraction — NO user auth. Runs the LLM on one file and returns
// the extracted fields. Used by the standalone /drop demo.
//
// There is no user identity here, so the per-user trial quota cannot apply.
// Instead a GLOBAL daily ceiling bounds the worst case if the shared password
// leaks — otherwise one password buys anyone unlimited Gemini calls on our
// bill. Tune with DROP_DEMO_DAILY_CAP.
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_DAILY_CAP = 200;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Lightweight shared-password gate to avoid public LLM abuse.
    // Sent in the body (not a header) so any Unicode password works.
    const expected = process.env.DROP_DEMO_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: "Demo ist deaktiviert." }, { status: 503 });
    }
    if (formData.get("key") !== expected) {
      return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 413 }
      );
    }

    // Reserve one demo scan globally, before spending anything.
    const cap = Number(process.env.DROP_DEMO_DAILY_CAP) || DEFAULT_DAILY_CAP;
    const admin = createServiceClient();
    const { data: gate, error: gateErr } = await admin
      .rpc("consume_demo_extraction", { p_cap: cap })
      .single();

    if (gateErr) {
      return NextResponse.json({ error: gateErr.message }, { status: 500 });
    }
    if (!gate?.allowed) {
      return NextResponse.json(
        { error: "Das Demo-Limit für heute ist erreicht. Bitte morgen wieder versuchen." },
        { status: 429 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;

    const provider = getLLMProvider();
    const extraction = await provider.extractInvoice(base64, mimeType);

    return NextResponse.json({
      extraction: extraction.data,
      confidence: extraction.confidence,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
