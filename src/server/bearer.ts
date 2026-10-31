// Pure bearer-token parsing (no imports: unit-testable).

/** Extracts the token from an `Authorization: Bearer <token>` header value. */
export function parseBearerToken(header: string | null | undefined): string | null {
  const value = header ?? "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}
