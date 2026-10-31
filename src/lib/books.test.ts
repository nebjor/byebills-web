import test from "node:test";
import assert from "node:assert/strict";
import { buildBooksCsv, sampleBooks, sumLines, totals, type BooksData } from "./books.ts";

const data: BooksData = {
  year: 2026,
  currency: "CHF",
  income: [{ category: "Spenden", amount: 100.5 }],
  expense: [
    { category: 'Material "A"', amount: 40 },
    { category: "Abos", amount: 10.25 },
  ],
};

test("sumLines adds amounts", () => {
  assert.equal(sumLines(data.expense), 50.25);
  assert.equal(sumLines([]), 0);
});

test("totals computes profit", () => {
  assert.deepEqual(totals(data), { totalIncome: 100.5, totalExpense: 50.25, profit: 50.25 });
});

test("sample data is consistent", () => {
  const t = totals(sampleBooks);
  assert.equal(Math.round(t.totalIncome * 100), 1377500);
  assert.equal(Math.round(t.totalExpense * 100), 1368494);
});

test("buildBooksCsv escapes quotes and appends totals", () => {
  const lines = buildBooksCsv(data).replace("﻿", "").split("\n");
  assert.equal(lines[0], '"Typ","Kategorie","Betrag","Währung"');
  assert.equal(lines[1], '"Einnahme","Spenden","100.50","CHF"');
  assert.equal(lines[2], '"Ausgabe","Material ""A""","40.00","CHF"');
  assert.equal(lines.at(-1), '"Gewinn","","50.25","CHF"');
});
