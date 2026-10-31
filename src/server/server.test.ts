import test from "node:test";
import assert from "node:assert/strict";
import { checkUpload, MAX_UPLOAD_BYTES } from "./uploads.ts";
import { decideQuota } from "./quota.ts";
import { clientIp, rateLimitKey } from "./rate-limit-core.ts";
import { parseCreateTransaction } from "./transactions/schema.ts";
import { parseWaitlistInput } from "./waitlist-input.ts";
import { demoPasswordMatches } from "./demo.ts";
import { AppError, toErrorResponse } from "./errors.ts";
import { parseBearerToken } from "./bearer.ts";

// ---- uploads ---------------------------------------------------------------
test("checkUpload accepts whitelisted types within the size limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]) {
    assert.deepEqual(checkUpload({ size: 1000, type }), { ok: true, mimeType: type });
  }
});

test("checkUpload rejects missing, empty, oversize and unsupported files", () => {
  assert.deepEqual(checkUpload(null), { ok: false, status: 400, error: "No file provided" });
  assert.equal(checkUpload({ size: 0, type: "image/png" }).ok, false);
  const big = checkUpload({ size: MAX_UPLOAD_BYTES + 1, type: "image/png" });
  assert.equal(big.ok === false && big.status, 413);
  assert.equal(checkUpload({ size: MAX_UPLOAD_BYTES, type: "image/png" }).ok, true);
  const bad = checkUpload({ size: 10, type: "text/html" });
  assert.equal(bad.ok === false && bad.status, 415);
});

test("checkUpload uses defaultMime only when the client sends no type", () => {
  assert.deepEqual(checkUpload({ size: 10, type: "" }, { defaultMime: "image/jpeg" }), {
    ok: true,
    mimeType: "image/jpeg",
  });
  assert.equal(checkUpload({ size: 10, type: "" }).ok, false);
  assert.equal(checkUpload({ size: 10, type: "image/gif" }, { defaultMime: "image/jpeg" }).ok, false);
});

// ---- quota -----------------------------------------------------------------
test("decideQuota allows and computes remaining", () => {
  assert.deepEqual(decideQuota({ allowed: true, used: 3, cap: 30, reason: "trial" }), {
    allowed: true,
    used: 3,
    cap: 30,
    remaining: 27,
  });
  const over = decideQuota({ allowed: true, used: 5, cap: 3, reason: "pro" });
  assert.equal(over.allowed && over.remaining, 0);
});

test("decideQuota maps blocked reasons to the 402 contract", () => {
  const daily = decideQuota({ allowed: false, used: 30, cap: 30, reason: "daily_cap" });
  assert.deepEqual(daily, {
    allowed: false,
    status: 402,
    body: { error: "Daily scan limit reached", reason: "daily_cap", used: 30, cap: 30 },
  });
  const ended = decideQuota({ allowed: false, used: 0, cap: 0, reason: "trial_ended" });
  assert.equal(!ended.allowed && ended.body.error, "Free trial ended");
});

test("decideQuota treats a missing row as blocked", () => {
  const d = decideQuota(null);
  assert.equal(d.allowed, false);
  assert.equal(!d.allowed && d.body.reason, "trial_ended");
});

// ---- transaction field whitelist ------------------------------------------
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const valid = { business_id: UUID, type: "expense", document_type: "bill", amount: 12.5 };

test("parseCreateTransaction applies defaults", () => {
  const r = parseCreateTransaction(valid);
  assert.ok(r.ok);
  assert.equal(r.data.status, "pending");
  assert.equal(r.data.currency, "CHF");
});

test("parseCreateTransaction strips user_id, verified, id and other unknown fields", () => {
  const r = parseCreateTransaction({
    ...valid,
    user_id: "attacker",
    verified: false,
    id: "x",
    created_at: "2000-01-01",
    raw_extraction: { a: 1 },
  });
  assert.ok(r.ok);
  for (const k of ["user_id", "verified", "id", "created_at", "raw_extraction"]) {
    assert.equal(k in r.data, false, `${k} must be dropped`);
  }
});

test("parseCreateTransaction coerces unknown payment_method to other", () => {
  const r = parseCreateTransaction({ ...valid, payment_method: "bitcoin" });
  assert.ok(r.ok);
  assert.equal(r.data.payment_method, "other");
  const ok = parseCreateTransaction({ ...valid, payment_method: "twint" });
  assert.ok(ok.ok);
  assert.equal(ok.data.payment_method, "twint");
});

test("parseCreateTransaction rejects bad input", () => {
  assert.equal(parseCreateTransaction(null).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, business_id: "nope" }).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, amount: "12" }).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, amount: Infinity }).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, type: "transfer" }).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, document_date: "31.12.2025" }).ok, false);
  assert.equal(parseCreateTransaction({ ...valid, duplicate_hash: "short" }).ok, false);
});

test("parseCreateTransaction error does not echo the submitted value", () => {
  const r = parseCreateTransaction({ ...valid, amount: "SECRET" });
  assert.ok(!r.ok);
  assert.ok(!r.error.includes("SECRET"));
});

// ---- waitlist --------------------------------------------------------------
test("parseWaitlistInput normalises and validates", () => {
  assert.deepEqual(parseWaitlistInput({ email: "  Foo@Bar.CH ", name: " Jo " }), {
    email: "foo@bar.ch",
    name: "Jo",
  });
  assert.equal(parseWaitlistInput({ email: "a@b.ch" })?.name, null);
  assert.equal(parseWaitlistInput({ email: "not-an-email" }), null);
  assert.equal(parseWaitlistInput(null), null);
  assert.equal(parseWaitlistInput({ email: "a".repeat(250) + "@b.ch" }), null);
});

// ---- rate limit helpers / auth / errors -----------------------------------
const hdr = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

test("clientIp prefers the first x-forwarded-for entry", () => {
  assert.equal(clientIp(hdr({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(hdr({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(hdr({})), "unknown");
  assert.equal(rateLimitKey("waitlist", "1.2.3.4"), "waitlist:1.2.3.4");
});

test("parseBearerToken", () => {
  assert.equal(parseBearerToken("Bearer abc"), "abc");
  assert.equal(parseBearerToken("bearer abc"), "abc");
  assert.equal(parseBearerToken("Bearer "), null);
  assert.equal(parseBearerToken("Basic abc"), null);
  assert.equal(parseBearerToken(null), null);
});

test("demoPasswordMatches is exact and type-safe", () => {
  assert.ok(demoPasswordMatches("pässwörd", "pässwörd"));
  assert.ok(!demoPasswordMatches("password", "pässwörd"));
  assert.ok(!demoPasswordMatches(null, "x"));
  assert.ok(!demoPasswordMatches("", "x"));
});

test("toErrorResponse hides internal error messages", () => {
  const original = console.error;
  console.error = () => {};
  try {
    const r = toErrorResponse(new Error("secret db password in message"), "test");
    assert.equal(r.status, 500);
    assert.deepEqual(r.body, { error: "Internal server error" });
  } finally {
    console.error = original;
  }
  const app = toErrorResponse(new AppError(402, "nope", { reason: "x" }), "test");
  assert.deepEqual(app, { status: 402, body: { error: "nope", reason: "x" } });
});
