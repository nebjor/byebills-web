"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAppData } from "@/components/app/app-data";
import TransactionRow from "@/components/app/transaction-row";
import { Button, Card, EmptyState } from "@/components/app/ui";
import { groupByDate, money, summarize } from "@/lib/app/model";

type Filter = "all" | "income" | "expense";

/** Full ledger — the web counterpart of the mobile (tabs)/transactions screen. */
export default function TransactionsPage() {
  const { profile, hustles, transactions, freshIds } = useAppData();
  const currency = profile?.currency ?? "CHF";

  const [filter, setFilter] = useState<Filter>("all");
  const [hustleId, setHustleId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === "income" && t.amount < 0) return false;
      if (filter === "expense" && t.amount >= 0) return false;
      if (hustleId !== "all" && t.hustle_id !== hustleId) return false;
      if (q && !`${t.title} ${t.meta}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, filter, hustleId, query]);

  const totals = useMemo(() => summarize(filtered), [filtered]);
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="px-5 pt-8">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">History</h1>
        <p className="mt-1.5 text-sm text-[var(--bb-ink-600)]">
          {totals.count} {totals.count === 1 ? "entry" : "entries"} ·{" "}
          <span style={{ color: totals.balance >= 0 ? "var(--bb-brand)" : "var(--bb-error)" }}>
            {money(totals.balance, currency)}
          </span>
        </p>
      </header>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or note…"
        className="mt-5 w-full rounded-2xl border-[1.5px] border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 text-base outline-none placeholder:text-[var(--bb-ink-400)] focus:border-[var(--bb-brand)]"
      />

      {/* Filters */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", "income", "expense"] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
          </Chip>
        ))}
        {hustles.length > 1 && (
          <>
            <span className="mx-1 w-px shrink-0 bg-[var(--bb-divider)]" />
            <Chip active={hustleId === "all"} onClick={() => setHustleId("all")}>
              All hustles
            </Chip>
            {hustles.map((h) => (
              <Chip key={h.id} active={hustleId === h.id} onClick={() => setHustleId(h.id)}>
                {h.name}
              </Chip>
            ))}
          </>
        )}
      </div>

      {groups.length === 0 ? (
        <Card className="mt-5" padded={false}>
          <EmptyState
            emoji="🔍"
            title={transactions.length ? "Nothing matches" : "No entries yet"}
            body={
              transactions.length
                ? "Try a different filter or search term."
                : "Scan a receipt here or in the app — everything lands in this list."
            }
            action={
              transactions.length ? undefined : (
                <Link href="/app/scan">
                  <Button>Scan a receipt</Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-xs font-extrabold tracking-[0.6px] text-[var(--bb-ink-600)]">
                {group.label.toUpperCase()}
              </h2>
              <Card padded={false}>
                <div className="p-1.5">
                  {group.rows.map((tx) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition-colors ${
        active
          ? "border-[var(--bb-brand)] bg-[var(--bb-brand)] text-[var(--bb-on-brand)]"
          : "border-[var(--bb-border)] bg-[var(--bb-surface)] text-[var(--bb-ink-600)]"
      }`}
    >
      {children}
    </button>
  );
}
