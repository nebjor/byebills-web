"use client";

import type { AppHustle, AppTransaction } from "@/lib/database.types";
import { hustleOf, money } from "@/lib/app/model";
import { HustleDot, StatusBadge } from "@/components/app/ui";

/**
 * One row in the ledger. `fresh` is set for rows that arrived over realtime
 * from another device — they animate in and carry a "just scanned" marker so
 * the user notices the phone's scan landing here.
 */
export default function TransactionRow({
  tx,
  hustles,
  currency,
  fresh = false,
  onClick,
}: {
  tx: AppTransaction;
  hustles: AppHustle[];
  currency: string;
  fresh?: boolean;
  onClick?: () => void;
}) {
  const hustle = hustleOf(hustles, tx.hustle_id);
  const income = tx.amount >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-[var(--bb-subtle)] ${
        fresh ? "bb-pop-in bg-[var(--bb-brand-tint)]" : ""
      }`}
    >
      <HustleDot
        name={hustle?.name ?? tx.title}
        color={hustle?.color ?? "var(--bb-ink-400)"}
        size={42}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold text-[var(--bb-ink)]">{tx.title}</span>
          {fresh && (
            <span className="shrink-0 rounded-full bg-[var(--bb-brand)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--bb-on-brand)]">
              NEW
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-[13px] text-[var(--bb-ink-600)]">
            {tx.meta || hustle?.name || "—"}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className="text-[15px] font-extrabold tabular-nums"
          style={{ color: income ? "var(--bb-brand)" : "var(--bb-ink)" }}
        >
          {income ? "+" : ""}
          {money(tx.amount, currency)}
        </span>
        <StatusBadge status={tx.status} />
      </span>
    </button>
  );
}
