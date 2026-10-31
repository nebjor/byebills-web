import type { TransactionInsert } from "@/lib/database.types";

/** Raw extraction result from any LLM provider */
export interface ExtractionResult {
  /** Parsed transaction fields */
  data: Omit<TransactionInsert, "business_id" | "duplicate_hash" | "verified" | "raw_extraction">;
  /** Confidence 0-1 */
  confidence: number;
  /** Raw LLM response for debugging */
  raw: Record<string, unknown>;
}

/** Common interface all LLM providers implement */
export interface LLMProvider {
  name: string;
  /** Extract invoice/bill data from a base64-encoded image or PDF */
  extractInvoice(
    fileBase64: string,
    mimeType: string
  ): Promise<ExtractionResult>;
}
