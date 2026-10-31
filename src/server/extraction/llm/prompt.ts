export const EXTRACTION_PROMPT = `You are an expert bookkeeper for small Swiss businesses.
Analyze this invoice/bill image and extract the following fields as JSON.

Required JSON schema:
{
  "type": "income" or "expense",
  "document_type": "invoice" or "bill",
  "status": "pending" or "paid" or "unpaid",
  "counterparty": "company or person name",
  "description": "brief description of what the invoice is for",
  "amount": number (total amount),
  "currency": "CHF" or other ISO currency code,
  "payment_method": "cash" | "bank" | "twint" | "card" | "other" | null,
  "document_ref": "invoice/reference number or null",
  "document_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "vat_amount": number or null,
  "vat_rate": number or null,
  "confidence": number between 0 and 1
}

Rules:
- If the document is sent TO the business (something they must pay), it's an "expense" with document_type "bill"
- If the document is sent BY the business (they expect payment), it's "income" with document_type "invoice"
- When in doubt about direction, default to "expense" / "bill" (most common scan use case)
- Extract amounts as plain numbers without currency symbols
- Dates are printed in DD.MM.YYYY (Swiss/European) format — read day, month and the EXACT 4-digit year as printed; never guess or default the year, and if only two year digits are shown treat "YY" as 20YY
- Output document_date and due_date as ISO YYYY-MM-DD; a date must never be in the future. On faded/crumpled thermal receipts a "6" can look like a "0" — if the year is ambiguous, choose the most recent plausible year
- Set confidence based on how clear/readable the document is
- Return ONLY valid JSON, no markdown fences, no explanation`;
