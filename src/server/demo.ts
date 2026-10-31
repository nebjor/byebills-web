import { timingSafeEqual } from "crypto";

/** Constant-time comparison of the shared demo password. */
export function demoPasswordMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
