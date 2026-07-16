import type { LLMProvider, ExtractionResult } from "./types";
import { EXTRACTION_PROMPT } from "./prompt";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-flash-latest") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractInvoice(
    fileBase64: string,
    mimeType: string
  ): Promise<ExtractionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const year = now.getFullYear();
    const prompt =
      `${EXTRACTION_PROMPT}\n\nToday's date is ${today} (current year ${year}). ` +
      `Receipts are almost always from ${year}, occasionally the previous year, and never in the future. ` +
      `If a printed year digit is ambiguous (e.g. a "6" that looks like a "0"), choose the most recent plausible year (prefer ${year}). ` +
      `Do not output a year more than one year before ${year}.`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: fileBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content in Gemini response");

    const parsed = JSON.parse(text);
    const confidence = parsed.confidence ?? 0.5;

    return {
      data: {
        type: parsed.type,
        document_type: parsed.document_type,
        status: parsed.status ?? "pending",
        counterparty: parsed.counterparty ?? null,
        description: parsed.description ?? null,
        amount: Number(parsed.amount),
        currency: parsed.currency ?? "CHF",
        vat_amount: parsed.vat_amount != null ? Number(parsed.vat_amount) : null,
        vat_rate: parsed.vat_rate != null ? Number(parsed.vat_rate) : null,
        payment_method: parsed.payment_method ?? null,
        document_ref: parsed.document_ref ?? null,
        document_date: parsed.document_date ?? null,
        due_date: parsed.due_date ?? null,
      },
      confidence,
      raw: json,
    };
  }
}
