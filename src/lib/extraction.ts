// Shared types + helpers for the standalone invoice-drop demo.
// No byeBills / Supabase coupling — everything stays client-side.

export type ExtractionData = {
  type: "income" | "expense";
  document_type: "invoice" | "bill";
  status: "pending" | "paid" | "unpaid";
  counterparty: string | null;
  description: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  document_ref: string | null;
  document_date: string | null;
  due_date: string | null;
  vat_amount: number | null;
  vat_rate: number | null;
};

export interface Entry extends ExtractionData {
  id: string;
  fileName: string;
}

/** Swiss-style money: 13'775.00 CHF (apostrophe thousands separator). */
export function formatMoney(n: number, currency = "CHF"): string {
  const sign = n < 0 ? "-" : "";
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  return `${sign}${grouped}.${dec} ${currency}`;
}

export function summarize(entries: Entry[]) {
  const income = entries.filter((e) => e.type === "income");
  const expense = entries.filter((e) => e.type === "expense");
  const totalIncome = income.reduce((t, e) => t + (e.amount || 0), 0);
  const totalExpense = expense.reduce((t, e) => t + (e.amount || 0), 0);
  const currency = entries[0]?.currency || "CHF";
  return {
    income,
    expense,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    currency,
  };
}
