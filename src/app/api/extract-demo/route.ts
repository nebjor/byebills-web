import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider } from "@/lib/llm";

// Public demo extraction — NO auth, NO database. Runs the LLM on one file
// and returns the extracted fields. Used by the standalone /drop demo.
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
