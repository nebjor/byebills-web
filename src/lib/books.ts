// Pure helpers for the simplified Milchbüechli books (income vs. expenses, no MwSt).
// No imports on purpose: keeps this unit-testable with the plain Node test runner.

export interface BookLine {
  /** Milchbüechli category, e.g. "Material", "Online Abos". */
  category: string;
  /** Amount (always positive; direction is implied by the list it is in). */
  amount: number;
}

export interface BooksData {
  year: number;
  currency: string;
  income: BookLine[];
  expense: BookLine[];
  /** Optional monthly totals for the trend chart (index 0 = Jan). */
  monthlyIncome?: number[];
  monthlyExpense?: number[];
}

export const sumLines = (lines: BookLine[]): number =>
  lines.reduce((t, l) => t + l.amount, 0);

export function totals(data: BooksData) {
  const totalIncome = sumLines(data.income);
  const totalExpense = sumLines(data.expense);
  return { totalIncome, totalExpense, profit: totalIncome - totalExpense };
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV (comma separated, quoted, BOM so Excel reads UTF-8) matching books-summary's export style. */
export function buildBooksCsv(data: BooksData): string {
  const { totalIncome, totalExpense, profit } = totals(data);
  const row = (...cells: (string | number)[]) => cells.map(esc).join(",");
  const rows = [row("Typ", "Kategorie", "Betrag", "Währung")];
  for (const l of data.income)
    rows.push(row("Einnahme", l.category, l.amount.toFixed(2), data.currency));
  for (const l of data.expense)
    rows.push(row("Ausgabe", l.category, l.amount.toFixed(2), data.currency));
  rows.push("");
  rows.push(row("Total Einnahmen", "", totalIncome.toFixed(2), data.currency));
  rows.push(row("Total Ausgaben", "", totalExpense.toFixed(2), data.currency));
  rows.push(row("Gewinn", "", profit.toFixed(2), data.currency));
  return "﻿" + rows.join("\n");
}

// TODO: replace with the signed-in user's real transactions once an authenticated
// app area exists and RLS on `transactions` is confirmed (see TODO.md). Transactions
// have no Milchbüechli category yet, so a mapping/aggregation step is needed too.
export const sampleBooks: BooksData = {
  year: 2026,
  currency: "CHF",
  income: [
    { category: "Einnahmen aus Veranstaltungen", amount: 13775.0 },
    { category: "Mitgliederbeiträge", amount: 0.0 },
    { category: "Spenden", amount: 0.0 },
  ],
  expense: [
    { category: "Musik", amount: 2058.71 },
    { category: "ÖV & Reisen", amount: 4457.67 },
    { category: "Material", amount: 1938.46 },
    { category: "Veranstaltungen", amount: 2540.0 },
    { category: "Sonstiger Ausgaben", amount: 1550.05 },
    { category: "Online Abos", amount: 900.05 },
    { category: "Studio Miete", amount: 240.0 },
  ],
  monthlyIncome: [600, 300, 900, 1500, 1800, 2400, 3100, 900, 600, 700, 300, 675],
  monthlyExpense: [700, 500, 850, 1200, 1500, 1900, 2100, 1100, 900, 800, 600, 534.94],
};
