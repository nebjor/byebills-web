"use client";

import { formatMoney } from "@/lib/extraction";
import { buildBooksCsv, sumLines, totals, type BookLine, type BooksData } from "@/lib/books";

/* Warm palette — matches the landing page / books-summary */
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";
const POS = "#0f766e";
const NEG = "#b4413c";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/**
 * Simplified Milchbüechli dashboard — income vs. expenses only, no MwSt,
 * no Aktive/Passive balance sheet.
 */
export default function BooksDashboard({ data, isSample = false }: { data: BooksData; isSample?: boolean }) {
  const { totalIncome, totalExpense, profit } = totals(data);
  const money = (n: number) => formatMoney(n, data.currency);

  function exportCsv() {
    const blob = new Blob([buildBooksCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `milchbuechli-${data.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto w-full max-w-4xl" style={{ color: INK, fontFamily: "var(--font-nunito)" }}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px]">Milchbüechli</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>
            Einnahmen-Ausgaben-Rechnung · ohne MwSt · {data.year}
            {isSample && " · Beispieldaten"}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Total Einnahmen" value={money(totalIncome)} color={POS} />
        <Kpi label="Total Ausgaben" value={money(totalExpense)} color={NEG} />
        <Kpi label="Gewinn" value={money(profit)} color={profit >= 0 ? POS : NEG} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title="Einnahmen">
          <LineList lines={data.income} money={money} />
          <Total label="Total Einnahmen" value={money(sumLines(data.income))} color={POS} />
        </Card>
        <Card title="Ausgaben">
          <LineList lines={data.expense} money={money} />
          <Total label="Total Ausgaben" value={money(sumLines(data.expense))} color={INK} />
        </Card>
      </div>

      {data.monthlyIncome && data.monthlyExpense && (
        <Card title="Verlauf pro Monat">
          <div className="mb-2 flex items-center gap-3 text-xs" style={{ color: MUTED }}>
            <Legend color={POS} label="Einnahmen" />
            <Legend color={NEG} label="Ausgaben" />
          </div>
          <MonthlyBars income={data.monthlyIncome} expense={data.monthlyExpense} />
        </Card>
      )}
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
      <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: CARD, borderColor: BORDER }}>
      <h2 className="mb-1 border-b pb-2.5 text-[15px] font-bold" style={{ borderColor: BORDER }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function LineList({ lines, money }: { lines: BookLine[]; money: (n: number) => string }) {
  return (
    <ul>
      {lines.map((l) => (
        <li key={l.category} className="flex justify-between gap-3 py-1.5 text-sm">
          <span style={{ color: MUTED }}>{l.category}</span>
          <span className="tabular-nums">{money(l.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="mt-2.5 flex justify-between border-t-2 pt-2.5 text-[15px] font-bold tabular-nums"
      style={{ borderColor: BORDER }}
    >
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function MonthlyBars({ income, expense }: { income: number[]; expense: number[] }) {
  const W = 720;
  const H = 180;
  const pad = 24;
  const gap = 10;
  const groupW = (W - pad * 2) / 12;
  const barW = (groupW - gap) / 2;
  const max = Math.max(...income, ...expense) * 1.1 || 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
      role="img"
      aria-label="Monatliche Einnahmen gegenüber Ausgaben"
    >
      {MONTHS.map((m, i) => {
        const x = pad + i * groupW;
        const hi = ((income[i] ?? 0) / max) * (H - 40);
        const he = ((expense[i] ?? 0) / max) * (H - 40);
        return (
          <g key={m}>
            <rect x={x + 2} y={H - 24 - hi} width={barW} height={hi} rx={2} fill={POS} />
            <rect x={x + 2 + barW} y={H - 24 - he} width={barW} height={he} rx={2} fill={NEG} />
            <text x={x + groupW / 2} y={H - 8} fontSize={11} textAnchor="middle" fill={MUTED}>
              {m}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
