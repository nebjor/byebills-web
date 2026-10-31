// Pure waitlist input validation (no imports: unit-testable).

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type WaitlistInput = { email: string; name: string | null };

/** Pure: normalises and validates the request body. Returns null if invalid. */
export function parseWaitlistInput(body: unknown): WaitlistInput | null {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  const name = String(b.name ?? "").trim().slice(0, 100) || null;
  return { email, name };
}
