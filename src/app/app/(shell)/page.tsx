"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useAppData } from "@/components/app/app-data";
import TransactionRow from "@/components/app/transaction-row";
import { Button, Card, EmptyState } from "@/components/app/ui";
import { money, summarize } from "@/lib/app/model";

/** Dashboard — the web counterpart of the mobile (tabs)/dashboard screen. */
export default function DashboardPage() {
  const { profile, hustles, transactions, freshIds } = useAppData();
  const currency = profile?.currency ?? "CHF";

  const totals = useMemo(() => summarize(transactions), [transactions]);
  const recent = transactions.slice(0, 6);

  const firstName = (profile?.name || "").trim().split(" ")[0];

  return (
    <div className="px-5 pt-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--bb-ink-600)]">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </p>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.5px]">Your books</h1>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/billie.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
      </header>

      {/* Balance */}
      <Card className="mt-6 bb-rise">
        <p className="text-xs font-extrabold tracking-[0.6px] text-[var(--bb-ink-600)]">
          BALANCE
        </p>
        <p
          className="mt-1.5 text-[40px] font-extrabold leading-none tabular-nums"
          style={{ color: totals.balance >= 0 ? "var(--bb-brand)" : "var(--bb-error)" }}
        >
          {money(totals.balance, currency)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--bb-success-tint)] p-3.5">
            <p className="text-[11px] font-extrabold tracking-[0.4px] text-[var(--bb-brand-ink)]">
              INCOME
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--bb-brand-ink)]">
              {money(totals.income, currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--bb-error-tint)] p-3.5">
            <p className="text-[11px] font-extrabold tracking-[0.4px] text-[var(--bb-err-ink)]">
              EXPENSES
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--bb-err-ink)]">
              {money(totals.expense, currency)}
            </p>
          </div>
        </div>
      </Card>

      {/* Hustles */}
      {hustles.length > 0 && (
        <section className="mt-7">
          <h2 className="text-lg font-extrabold">Your hustles</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {hustles.map((h) => {
              const rows = transactions.filter((t) => t.hustle_id === h.id);
              const sum = summarize(rows);
              return (
                <div
                  key={h.id}
                  className="min-w-[150px] shrink-0 rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <p className="mt-2 truncate text-sm font-bold">{h.name}</p>
                  <p
                    className="mt-1 text-base font-extrabold tabular-nums"
                    style={{ color: sum.balance >= 0 ? "var(--bb-brand)" : "var(--bb-error)" }}
                  >
                    {money(sum.balance, currency)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--bb-ink-600)]">
                    {sum.count} {sum.count === 1 ? "entry" : "entries"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Recent</h2>
          {transactions.length > 0 && (
            <Link
              href="/app/transactions"
              className="text-sm font-bold text-[var(--bb-brand)] hover:underline"
            >
              See all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <Card className="mt-3" padded={false}>
            <EmptyState
              emoji="🧾"
              title="No entries yet"
              body="Scan a receipt here, or snap one in the byeBills app — it shows up on this page the moment it's saved."
              action={
                <Link href="/app/scan">
                  <Button>Scan your first receipt</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="mt-3 divide-y divide-[var(--bb-divider)]" padded={false}>
            <div className="p-1.5">
              {recent.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  hustles={hustles}
                  currency={currency}
                  fresh={freshIds.has(tx.id)}
                />
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
