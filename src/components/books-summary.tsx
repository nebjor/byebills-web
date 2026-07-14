"use client";

import { type Entry, formatMoney, summarize } from "@/lib/extraction";

/* Warm palette — matches the landing page */
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";
const POS = "#0f766e";
const NEG = "#b4413c";

export default function BooksSummary({ entries }: { entries: Entry[] }) {
  const { income, expense, totalIncome, totalExpense, balance, currency } =
    summarize(entries);

  function exportCsv() {
    const esc = (v: string | number | null) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows: string[] = [
      ["Typ", "Datum", "Gegenpartei", "Beschreibung", "Betrag", "Währung"]
        .map(esc)
        .join(","),
    ];
    for (const e of entries) {
      rows.push(
        [
          e.type === "income" ? "Einnahme" : "Ausgabe",
          e.document_date ?? "",
          e.counterparty ?? "",
          e.description ?? "",
          e.amount.toFixed(2),
          e.currency,
        ]
          .map(esc)
          .join(",")
      );
    }
    rows.push("");
    rows.push([esc("Total Einnahmen"), "", "", "", esc(totalIncome.toFixed(2)), esc(currency)].join(","));
    rows.push([esc("Total Ausgaben"), "", "", "", esc(totalExpense.toFixed(2)), esc(currency)].join(","));
    rows.push([esc("Saldo"), "", "", "", esc(balance.toFixed(2)), esc(currency)].join(","));

    const blob = new Blob(["﻿" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abrechnung.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const barMax = Math.max(totalIncome, totalExpense, 1);

  return (
    <section
      className="mx-auto mt-10 w-full max-w-2xl"
      style={{ color: INK, fontFamily: "var(--font-nunito)" }}
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.5px]">
            Deine Abrechnung
          </h2>
          <p className="text-[14px]" style={{ color: MUTED }}>
            Einnahmen &amp; Ausgaben · {entries.length}{" "}
            {entries.length === 1 ? "Beleg" : "Belege"} · ohne MwSt
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Kpi label="Einnahmen" value={formatMoney(totalIncome, currency)} color={POS} />
        <Kpi label="Ausgaben" value={formatMoney(totalExpense, currency)} color={NEG} />
        <Kpi
          label="Saldo"
          value={formatMoney(balance, currency)}
          color={balance >= 0 ? POS : NEG}
        />
      </div>

      {/* Income vs expense bar */}
      <div className="mb-4 rounded-xl border p-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
        <Bar label="Einnahmen" value={totalIncome} max={barMax} color={POS} currency={currency} />
        <div className="h-2" />
        <Bar label="Ausgaben" value={totalExpense} max={barMax} color={NEG} currency={currency} />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column title="Einnahmen" entries={income} color={POS} currency={currency} />
        <Column title="Ausgaben" entries={expense} color={NEG} currency={currency} />
      </div>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
      <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1.5 text-[18px] font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  currency,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  currency: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px]">
        <span style={{ color: MUTED }}>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {formatMoney(value, currency)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#EDE6D6" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Column({
  title,
  entries,
  color,
  currency,
}: {
  title: string;
  entries: Entry[];
  color: string;
  currency: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
      <h3 className="mb-1 border-b pb-2.5 text-[15px] font-bold" style={{ borderColor: BORDER }}>
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="py-2 text-sm" style={{ color: MUTED }}>
          Noch nichts.
        </p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {e.counterparty ?? "Unbekannt"}
                </span>
                {e.document_date && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    {e.document_date}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold tabular-nums" style={{ color }}>
                {formatMoney(e.amount, e.currency || currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
