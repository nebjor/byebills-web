/**
 * Module registry.
 *
 * The catalogue of things a customer can switch on for themselves. The UI
 * renders from this list, so adding a module is a matter of adding an entry
 * plus a connector — no UI work per module.
 *
 * Direction matters and is the thing the old `SyncTarget` interface got wrong:
 *   - "out"  we push our transactions somewhere else (Google Sheets, Xero)
 *   - "in"   we pull money events in and create transactions (webshops, Stripe)
 * They share nothing but a config row, so they're modelled separately.
 */

export type ModuleDirection = "in" | "out";

export type ModuleField = {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  /** Secret fields are written to app_integration_secrets, never to config. */
  secret?: boolean;
  required?: boolean;
};

export type ModuleDef = {
  type: string;
  name: string;
  /** One line the customer reads to decide whether they want it. */
  blurb: string;
  direction: ModuleDirection;
  category: "shop" | "payments" | "export" | "people";
  /** Shipping, or visible-but-not-yet-connectable. */
  status: "live" | "soon";
  /** Paid tier required, if any. */
  tier?: "basic" | "pro";
  fields: ModuleField[];
  /** Shown on the settings screen so expectations are set before enabling. */
  notes?: string[];
};

export const MODULES: ModuleDef[] = [
  // ---------- Money coming in ----------
  {
    type: "stripe_payouts",
    name: "Stripe payouts",
    blurb:
      "Books each Stripe payout as income and the fees as an expense — the amounts that actually hit your bank.",
    direction: "in",
    category: "payments",
    status: "live",
    tier: "basic",
    fields: [
      {
        key: "restricted_key",
        label: "Stripe restricted key",
        placeholder: "rk_live_…",
        hint: "A restricted key with read access to Payouts and Balance transactions.",
        secret: true,
        required: true,
      },
    ],
    notes: [
      "Imports payouts, not individual orders — one clean row per settlement instead of hundreds.",
      "Works with any shop that settles through Stripe, whatever platform it runs on.",
    ],
  },
  {
    type: "shopify",
    name: "Shopify",
    blurb: "Imports your Shopify payouts and platform fees automatically.",
    direction: "in",
    category: "shop",
    status: "live",
    tier: "basic",
    fields: [
      {
        key: "shop_domain",
        label: "Shop domain",
        placeholder: "my-store.myshopify.com",
        required: true,
      },
      {
        key: "access_token",
        label: "Admin API access token",
        hint: "Custom app token with the read_shopify_payments_payouts scope.",
        secret: true,
        required: true,
      },
      {
        key: "api_version",
        label: "API version (optional)",
        placeholder: "2024-10",
        hint: "Leave blank unless Shopify has asked you to change it.",
      },
    ],
    notes: [
      "Payout-level, so a busy month stays readable.",
      "If your shop settles through Stripe rather than Shopify Payments, use the Stripe module instead.",
    ],
  },
  {
    type: "woocommerce",
    name: "WooCommerce",
    blurb: "Pulls settled orders from a WooCommerce store into your books.",
    direction: "in",
    category: "shop",
    status: "soon",
    tier: "basic",
    fields: [
      { key: "site_url", label: "Store URL", placeholder: "https://shop.example.ch", required: true },
      { key: "consumer_key", label: "Consumer key", secret: true, required: true },
      { key: "consumer_secret", label: "Consumer secret", secret: true, required: true },
    ],
  },
  {
    type: "medusa",
    name: "Medusa",
    blurb: "Connects a self-hosted Medusa storefront to your bookkeeping.",
    direction: "in",
    category: "shop",
    status: "soon",
    tier: "basic",
    fields: [
      { key: "backend_url", label: "Medusa backend URL", placeholder: "https://api.example.ch", required: true },
      { key: "api_key", label: "Admin API key", secret: true, required: true },
    ],
    notes: ["For self-hosted shops. Settlement still comes from your payment provider."],
  },

  // ---------- Data going out ----------
  {
    type: "google_sheets",
    name: "Google Sheets",
    blurb: "Mirrors every transaction into a spreadsheet as you save it.",
    direction: "out",
    category: "export",
    status: "soon",
    fields: [
      { key: "spreadsheet_id", label: "Spreadsheet ID", required: true },
      { key: "sheet_name", label: "Tab name", placeholder: "Transactions" },
    ],
  },
  {
    type: "accountant_share",
    name: "Accountant access",
    blurb: "Gives your Treuhänder a read-only view — no exporting, no emailing ZIPs.",
    direction: "out",
    category: "people",
    status: "soon",
    tier: "pro",
    fields: [
      { key: "email", label: "Their email address", placeholder: "name@treuhand.ch", required: true },
    ],
  },
];

export function moduleByType(type: string): ModuleDef | undefined {
  return MODULES.find((m) => m.type === type);
}

/**
 * Split a submitted form into the part that may live in the browser-readable
 * config row and the part that must go to the service-role-only secrets table.
 */
export function splitSecrets(
  def: ModuleDef,
  values: Record<string, string>,
): { config: Record<string, string>; secrets: Record<string, string> } {
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const field of def.fields) {
    const v = values[field.key];
    if (v === undefined || v === "") continue;
    if (field.secret) secrets[field.key] = v;
    else config[field.key] = v;
  }
  return { config, secrets };
}

/**
 * Deterministic transaction id for an imported event.
 *
 * The id is the dedupe key: re-running an import, or a webhook firing twice,
 * collides on app_transactions' primary key instead of double-booking income.
 * Every inbound connector must use this.
 */
export function importedTransactionId(moduleType: string, externalId: string): string {
  return `${moduleType}:${externalId}`;
}
