/**
 * Inbound connectors — money events from the outside world becoming entries.
 *
 * The accounting model, which is the important part:
 *
 * We import PAYOUTS (settlements that hit the bank), not orders. A shop doing
 * 500 orders a month would otherwise put 500 rows in a ledger meant to be read
 * by a human, and no accountant wants that. One settlement produces two rows —
 * gross takings as income, platform fees as an expense — which nets to exactly
 * the figure on the bank statement. That's what makes reconciliation possible.
 *
 * Every entry carries a deterministic id derived from the source event, so a
 * replayed webhook or a re-run import collides on app_transactions' primary
 * key instead of double-booking income.
 */

export type ImportedEntry = {
  /** Stable id of the source event, e.g. a Stripe payout id. */
  externalId: string;
  /** ISO date the money settled. */
  date: string;
  title: string;
  meta: string;
  /** Positive = income, negative = expense. Major units, not cents. */
  amount: number;
  currency: string;
};

export type ImportResult = {
  entries: ImportedEntry[];
  /** Resume point stored on the integration, so the next run starts here. */
  cursor?: string;
};

export type ConnectorContext = {
  config: Record<string, string>;
  secrets: Record<string, string>;
  /** Where the last run stopped. Undefined on a first run. */
  cursor?: string | null;
};

export interface InboundConnector {
  type: string;
  /** Verify credentials before we tell the customer they're connected. */
  test(ctx: ConnectorContext): Promise<{ ok: boolean; message?: string }>;
  /** Fetch settlements newer than the cursor. */
  fetch(ctx: ConnectorContext): Promise<ImportResult>;
}

/** Minor units (cents/Rappen) to major, without float drift on the divide. */
export function fromMinor(minor: number): number {
  return Math.round(minor) / 100;
}
