import {
  fromMinor,
  type ImportedEntry,
  type ImportResult,
  type InboundConnector,
} from "./types";

/**
 * Stripe payouts.
 *
 * Deliberately platform-agnostic: Shopify, WooCommerce, Medusa and custom
 * checkouts all settle through Stripe, so this one connector covers a shop
 * whatever it's built on.
 *
 * For each payout we read the balance transactions it contains, which is the
 * only way to separate gross takings from fees — the payout object alone gives
 * the net figure, and "net" isn't a bookkeeping entry, it's the difference
 * between two of them.
 *
 *   gross charges      -> income
 *   fees               -> expense
 *   income - expense   == payout.amount, i.e. the bank line
 */

const API = "https://api.stripe.com/v1";

type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number;
  status: string;
};

type StripeBalanceTx = {
  id: string;
  amount: number;
  fee: number;
  type: string;
};

async function stripeGet<T>(
  path: string,
  key: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();

  const res = await fetch(`${API}${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      // Pin the version so a Stripe upgrade can't silently change our shapes.
      "Stripe-Version": "2024-06-20",
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Stripe returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export const stripeConnector: InboundConnector = {
  type: "stripe_payouts",

  async test({ secrets }) {
    const key = secrets.restricted_key;
    if (!key) return { ok: false, message: "No API key stored" };
    try {
      await stripeGet<{ data: StripePayout[] }>("/payouts", key, { limit: 1 });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not reach Stripe" };
    }
  },

  async fetch({ secrets, cursor }): Promise<ImportResult> {
    const key = secrets.restricted_key;
    if (!key) throw new Error("No API key stored");

    // starting_after resumes from the last payout we imported. Stripe returns
    // newest-first, so on a first run we take the most recent page only —
    // importing a shop's entire history unasked would be a nasty surprise.
    const params: Record<string, string | number> = { limit: 25, status: "paid" };
    if (cursor) params.starting_after = cursor;

    const payouts = await stripeGet<{ data: StripePayout[] }>("/payouts", key, params);
    const entries: ImportedEntry[] = [];

    for (const payout of payouts.data) {
      const txns = await stripeGet<{ data: StripeBalanceTx[] }>("/balance_transactions", key, {
        payout: payout.id,
        limit: 100,
      });

      let gross = 0;
      let fees = 0;
      for (const t of txns.data) {
        // The payout row itself appears in its own list; counting it would
        // double the total.
        if (t.type === "payout") continue;
        gross += t.amount;
        fees += t.fee;
      }

      // Fall back to the payout total if the breakdown is empty (very old
      // payouts, or a permission that doesn't cover balance transactions).
      if (gross === 0 && fees === 0) gross = payout.amount;

      const date = new Date(payout.arrival_date * 1000).toISOString().slice(0, 10);
      const currency = payout.currency.toUpperCase();

      entries.push({
        externalId: payout.id,
        date,
        title: "Stripe payout",
        meta: `Settlement ${payout.id}`,
        amount: fromMinor(gross),
        currency,
      });

      if (fees > 0) {
        entries.push({
          externalId: `${payout.id}:fees`,
          date,
          title: "Stripe fees",
          meta: `Fees on ${payout.id}`,
          amount: -fromMinor(fees),
          currency,
        });
      }
    }

    // Oldest of this page becomes the resume point — Stripe pages newest-first.
    const last = payouts.data.at(-1);

    return { entries, cursor: last?.id ?? cursor ?? undefined };
  },
};
