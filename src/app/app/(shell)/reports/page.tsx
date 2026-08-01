"use client";

import { useMemo, useState } from "react";

import { useAppData } from "@/components/app/app-data";
import { Button, Card, EmptyState } from "@/components/app/ui";
import { money, summarize } from "@/lib/app/model";
import type { AppTransaction } from "@/lib/database.types";

/**
 * Reports — month-by-month totals plus a CSV export for the tax office.
 *
 * This is the screen that replaces the pile of spreadsheets: one row per month,
 * per hustle, and a download that an accountant (or the Steueramt) accepts.
 */
export default function ReportsPage() {
  const { profile, hustles, transactions } = useAppData();
  const currency = profile?.currency ?? "CHF";

  const years = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 4)));
    const list = Array.from(set).sort().reverse();
    return list.length ? list : [String(new Date().getFullYear())];
  }, [transactions]);

  const [year, setYear] = useState(years[0]);

  const inYear = useMemo(
    () => transactions.filter((t) => t.date.startsWith(year)),
    [transactions, year],
  );

  const totals = useMemo(() => summarize(inYear), [inYear]);

  const months = useMemo(() => {
    const out: { key: string; label: string; income: number; expense: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const rows = inYear.filter((t) => t.date.startsWith(key));
      if (!rows.length) continue;
      const s = summarize(rows);
      out.push({
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long" }),
        income: s.income,
        expense: s.expense,
      });
    }
    return out.reverse();
  }, [inYear, year]);

  const peak = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));

  const perHustle = useMemo(
    () =>
      hustles
        .map((h) => ({ hustle: h, ...summarize(inYear.filter((t) => t.hustle_id === h.id)) }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.balance - a.balance),
    [hustles, inYear],
  );

  function exportCsv() {
    const header = ["date", "title", "note", "hustle", "type", "amount", "currency", "status"];
    const lines = inYear
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t: AppTransaction) => {
        const hustle = hustles.find((h) => h.id === t.hustle_id)?.name ?? "";
        return [
          t.date,
          t.title,
          t.meta,
          hustle,
          t.amount >= 0 ? "income" : "expense",
          Math.abs(t.amount).toFixed(2),
          currency,
          t.status,
        ]
          .map(csvCell)
          .join(",");
      });

    // BOM so Excel opens UTF-8 correctly — accents in vendor names survive.
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `byebills-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 pt-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">Reports</h1>
          <p className="mt-1.5 text-sm text-[var(--bb-ink-600)]">
            Your year at a glance, ready for the tax office.
          </p>
        </div>
      </header>

      {years.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`shrink-0 rounded-full border-[1.5px] px-4 py-2 text-sm font-bold transition-colors ${
                y === year
                  ? "border-[var(--bb-brand)] bg-[var(--bb-brand)] text-[var(--bb-on-brand)]"
                  : "border-[var(--bb-border)] bg-[var(--bb-surface)] text-[var(--bb-ink-600)]"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {inYear.length === 0 ? (
        <Card className="mt-5" padded={false}>
          <EmptyState
            emoji="📊"
            title={`Nothing in ${year} yet`}
            body="Once you've scanned a few receipts, your monthly totals and CSV export appear here."
          />
        </Card>
      ) : (
        <>
          <Card className="mt-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.4px] text-[var(--bb-ink-600)]">
                  INCOME
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--bb-brand)]">
                  {money(totals.income, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.4px] text-[var(--bb-ink-600)]">
                  EXPENSES
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--bb-err-ink)]">
                  {money(totals.expense, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.4px] text-[var(--bb-ink-600)]">
                  PROFIT
                </p>
                <p
                  className="mt-1 text-lg font-extrabold tabular-nums"
                  style={{ color: totals.balance >= 0 ? "var(--bb-brand)" : "var(--bb-error)" }}
                >
                  {money(totals.balance, currency)}
                </p>
              </div>
            </div>

            <Button fullWidth variant="secondary" className="mt-5" onClick={exportCsv}>
              Export {year} as CSV
            </Button>
          </Card>

          {/* Monthly bars */}
          <section className="mt-7">
            <h2 className="text-lg font-extrabold">By month</h2>
            <Card className="mt-3">
              <div className="flex flex-col gap-4">
                {months.map((m) => (
                  <div key={m.key}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className="text-sm font-extrabold tabular-nums">
                        {money(m.income - m.expense, currency)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1">
                      <Bar value={m.income} peak={peak} color="var(--bb-brand)" label="income" />
                      <Bar value={m.expense} peak={peak} color="var(--bb-error)" label="expenses" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {perHustle.length > 0 && (
            <section className="mt-7">
              <h2 className="text-lg font-extrabold">By hustle</h2>
              <Card className="mt-3">
                <div className="flex flex-col gap-3.5">
                  {perHustle.map((r) => (
                    <div key={r.hustle.id} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: r.hustle.color }}
                      />
                      <p className="flex-1 truncate text-sm font-bold">{r.hustle.name}</p>
                      <p className="text-[13px] text-[var(--bb-ink-600)]">{r.count}×</p>
                      <p
                        className="w-28 text-right text-sm font-extrabold tabular-nums"
                        style={{ color: r.balance >= 0 ? "var(--bb-brand)" : "var(--bb-error)" }}
                      >
                        {money(r.balance, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Bar({
  value,
  peak,
  color,
  label,
}: {
  value: number;
  peak: number;
  color: string;
  label: string;
}) {
  const pct = Math.round((value / peak) * 100);
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bb-track)]"
      role="img"
      aria-label={`${label}: ${value.toFixed(2)}`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** RFC-4180 quoting so commas, quotes and newlines in a vendor name survive. */
function csvCell(v: string) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
