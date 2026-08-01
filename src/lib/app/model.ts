import type { AppHustle, AppTransaction } from "@/lib/database.types";
import type { ExtractionData } from "@/lib/extraction";

/**
 * The shared row shape.
 *
 * `app_transactions` is deliberately the MOBILE app's shape (title / meta /
 * signed amount / hustle_id / date) because that is what both clients render.
 * Gemini returns a much richer document (counterparty, VAT, due date, refs) —
 * this module is the single place that flattens one into the other, so web and
 * mobile can never disagree about what a scan means.
 */

export type TxStatus = "paid" | "pending" | "overdue" | "draft";

export const HUSTLE_PALETTE = [
  "#15A95E", // brand
  "#7A5AF8", // purple
  "#3B82F6", // info
  "#F5A524", // warning
  "#E5484D", // error
  "#0EA5A5",
];

export function nextHustleColor(existingCount: number): string {
  return HUSTLE_PALETTE[existingCount % HUSTLE_PALETTE.length];
}

/** Gemini's status vocabulary -> the one the app renders. */
function toStatus(raw: string | null | undefined, dueDate: string | null): TxStatus {
  if (raw === "paid") return "paid";
  // An unpaid document whose due date has passed is overdue, not merely pending.
  if (dueDate && new Date(dueDate) < new Date(new Date().toDateString())) {
    return "overdue";
  }
  return "pending";
}

/**
 * Flatten an extraction into a row.
 *
 * Sign convention: `app_transactions.amount` is SIGNED (income positive,
 * expense negative) — that's what mobile's reducers assume. Gemini always
 * returns a positive magnitude plus a `type`, so the sign is applied here.
 */
export function extractionToRow(
  extraction: ExtractionData,
  opts: { userId: string; hustleId: string; id: string; imagePath?: string | null },
): AppTransaction {
  const magnitude = Math.abs(Number(extraction.amount) || 0);
  const signed = extraction.type === "income" ? magnitude : -magnitude;

  const metaParts = [
    extraction.description,
    extraction.document_ref ? `Nr. ${extraction.document_ref}` : null,
  ].filter(Boolean) as string[];

  return {
    user_id: opts.userId,
    id: opts.id,
    title: extraction.counterparty || extraction.description || "Beleg",
    meta: metaParts.join(" · "),
    amount: signed,
    status: toStatus(extraction.status, extraction.due_date),
    hustle_id: opts.hustleId,
    date: extraction.document_date || new Date().toISOString().slice(0, 10),
    image_path: opts.imagePath ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- Presentation helpers (shared by every app screen) ----------

/** Swiss-style money: 13’775.00 CHF (apostrophe thousands separator). */
export function money(n: number, currency = "CHF"): string {
  const sign = n < 0 ? "−" : "";
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  return `${sign}${grouped}.${dec} ${currency}`;
}

/** Same date buckets the mobile transaction list uses. */
export function dateGroup(iso: string, now = new Date()): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date(now.toDateString());
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString("en-GB", { month: "long" });
  }
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function groupByDate(rows: AppTransaction[]): { label: string; rows: AppTransaction[] }[] {
  const out: { label: string; rows: AppTransaction[] }[] = [];
  for (const row of rows) {
    const label = dateGroup(row.date);
    const bucket = out.find((g) => g.label === label);
    if (bucket) bucket.rows.push(row);
    else out.push({ label, rows: [row] });
  }
  return out;
}

export function summarize(rows: AppTransaction[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.amount >= 0) income += r.amount;
    else expense += -r.amount;
  }
  return { income, expense, balance: income - expense, count: rows.length };
}

export function hustleOf(hustles: AppHustle[], id: string): AppHustle | undefined {
  return hustles.find((h) => h.id === id);
}
