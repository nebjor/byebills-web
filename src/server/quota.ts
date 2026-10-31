// Pure interpretation of the consume_extraction() RPC row (no imports).

export interface QuotaRow {
  allowed: boolean;
  used: number;
  cap: number;
  /** 'daily_cap' | 'trial_ended' when blocked; 'trial' | 'pro' when allowed. */
  reason: string;
}

export type QuotaDecision =
  | { allowed: true; used: number; cap: number; remaining: number }
  | { allowed: false; status: 402; body: Record<string, unknown> };

/** Turns the RPC result into "go ahead" or a 402 body (shape used by the mobile app). */
export function decideQuota(row: QuotaRow | null | undefined): QuotaDecision {
  if (!row?.allowed) {
    const daily = row?.reason === "daily_cap";
    return {
      allowed: false,
      status: 402,
      body: {
        error: daily ? "Daily scan limit reached" : "Free trial ended",
        reason: row?.reason ?? "trial_ended",
        used: row?.used,
        cap: row?.cap,
      },
    };
  }
  return {
    allowed: true,
    used: row.used,
    cap: row.cap,
    remaining: Math.max(0, row.cap - row.used),
  };
}
