import { createAdminClient } from "./auth";
import { AppError } from "./errors";
import { clientIp, rateLimitKey, type HeaderReader, type RateLimitRule } from "./rate-limit-core";

export { clientIp, rateLimitKey, type RateLimitRule } from "./rate-limit-core";

/**
 * Fixed-window rate limit backed by the Supabase `rate_limit_hit` RPC
 * (see supabase/security_hardening.sql). State lives in Postgres, so it holds
 * across serverless instances (unlike in-memory counters on Vercel).
 *
 * `increment: 0` only peeks (is this key already over the limit?).
 * Returns true when the request is allowed.
 *
 * Fails OPEN: if the RPC is missing (migration not applied yet) or Supabase is
 * unreachable, requests are allowed and the error is logged. This keeps the
 * public endpoints available at the price of no protection during an outage.
 */
export async function rateLimitAllows(
  headers: HeaderReader,
  rule: RateLimitRule,
  increment = 1
): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: rateLimitKey(rule.bucket, clientIp(headers)),
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
      p_increment: increment,
    });
    if (error) {
      console.error("[rate-limit] rpc failed (failing open)", error);
      return true;
    }
    return data !== false;
  } catch (err) {
    console.error("[rate-limit] unexpected failure (failing open)", err);
    return true;
  }
}

/** Throws a 429 AppError when the caller is over the limit. */
export async function enforceRateLimit(headers: HeaderReader, rule: RateLimitRule) {
  if (!(await rateLimitAllows(headers, rule))) {
    throw new AppError(429, "Too many requests. Please try again later.");
  }
}
