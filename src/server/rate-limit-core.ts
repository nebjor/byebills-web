// Pure helpers for rate limiting (no imports: unit-testable).

export interface HeaderReader {
  get(name: string): string | null;
}

/** Best-effort client IP. On Vercel `x-forwarded-for` is set by the platform. */
export function clientIp(headers: HeaderReader): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : "unknown";
}

export interface RateLimitRule {
  bucket: string;
  max: number;
  windowSeconds: number;
}

export function rateLimitKey(bucket: string, ip: string): string {
  return `${bucket}:${ip}`;
}
