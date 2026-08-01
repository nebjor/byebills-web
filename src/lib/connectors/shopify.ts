import {
  type ConnectorContext,
  type ImportedEntry,
  type ImportResult,
  type InboundConnector,
} from "./types";

/**
 * Shopify Payments payouts.
 *
 * Same model as the Stripe connector — one settlement becomes gross takings
 * plus fees — but Shopify hands us the breakdown directly in `summary`, so
 * there's no second request per payout.
 *
 * Note Shopify returns amounts as decimal STRINGS ("1240.50"), not minor
 * units. Parsing them as cents would inflate every figure by 100×.
 */

const DEFAULT_API_VERSION = "2024-10";

type ShopifyPayout = {
  id: number;
  date: string;
  currency: string;
  amount: string;
  status: string;
  summary?: {
    charges_gross_amount?: string;
    charges_fee_amount?: string;
    refunds_fee_amount?: string;
    adjustments_fee_amount?: string;
    adjustments_gross_amount?: string;
    refunds_gross_amount?: string;
  };
};

const num = (v?: string) => (v ? Number(v) || 0 : 0);

export const shopifyConnector: InboundConnector = {
  type: "shopify",

  async test({ config, secrets }) {
    const shop = normaliseDomain(config.shop_domain);
    const token = secrets.access_token;
    if (!shop || !token) return { ok: false, message: "Missing shop domain or access token" };

    try {
      const res = await call(shop, token, config.api_version, "shopify_payments/payouts.json", {
        limit: "1",
      });
      if (!res.ok) {
        return {
          ok: false,
          message:
            res.status === 401 || res.status === 403
              ? "Shopify rejected the token. It needs the read_shopify_payments_payouts scope."
              : `Shopify returned ${res.status}`,
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not reach Shopify" };
    }
  },

  async fetch({ config, secrets, cursor }: ConnectorContext): Promise<ImportResult> {
    const shop = normaliseDomain(config.shop_domain);
    const token = secrets.access_token;
    if (!shop || !token) throw new Error("Missing shop domain or access token");

    const params: Record<string, string> = { limit: "25", status: "paid" };
    // since_id resumes after the last payout we imported.
    if (cursor) params.since_id = cursor;

    const res = await call(shop, token, config.api_version, "shopify_payments/payouts.json", params);
    if (!res.ok) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "Shopify rejected the token (needs read_shopify_payments_payouts)"
          : `Shopify returned ${res.status}`,
      );
    }

    const body = (await res.json()) as { payouts?: ShopifyPayout[] };
    const payouts = body.payouts ?? [];
    const entries: ImportedEntry[] = [];

    for (const p of payouts) {
      const date = p.date.slice(0, 10);
      const currency = p.currency.toUpperCase();
      const s = p.summary ?? {};

      const gross =
        num(s.charges_gross_amount) + num(s.adjustments_gross_amount) - num(s.refunds_gross_amount);
      const fees =
        num(s.charges_fee_amount) + num(s.refunds_fee_amount) + num(s.adjustments_fee_amount);

      entries.push({
        externalId: String(p.id),
        date,
        title: "Shopify payout",
        meta: `Settlement ${p.id}`,
        // No summary (rare, older payouts) — fall back to the net amount so the
        // bank line still reconciles, even without the fee split.
        amount: gross || num(p.amount),
        currency,
      });

      if (fees > 0) {
        entries.push({
          externalId: `${p.id}:fees`,
          date,
          title: "Shopify fees",
          meta: `Fees on payout ${p.id}`,
          amount: -fees,
          currency,
        });
      }
    }

    // Shopify returns newest-first; resume from the highest id we've seen.
    const maxId = payouts.reduce((m, p) => (p.id > m ? p.id : m), 0);

    return { entries, cursor: maxId ? String(maxId) : (cursor ?? undefined) };
  },
};

/** Accept "shop.myshopify.com", with or without scheme or trailing slash. */
function normaliseDomain(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

function call(
  shop: string,
  token: string,
  apiVersion: string | undefined,
  path: string,
  params: Record<string, string>,
) {
  const version = apiVersion || DEFAULT_API_VERSION;
  const qs = new URLSearchParams(params).toString();
  return fetch(`https://${shop}/admin/api/${version}/${path}?${qs}`, {
    headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
  });
}
