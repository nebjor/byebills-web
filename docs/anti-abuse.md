# byeBills — Anti-abuse & wallet protection

Layered defense so no one can drain the Gemini bill. Each layer is independent —
if one fails, the next still holds.

## Threat model
1. **Honest heavy user** — scans a lot during the trial.
2. **Trial farmer** — makes many accounts / reinstalls to keep scanning free.
3. **Endpoint attacker** — scripts `POST /api/mobile/extract` directly to burn compute.

---

## Layer 1 — Auth required, identity from the verified JWT
- `/api/mobile/extract` requires a valid Supabase access token; identity is `auth.uid()`. No token → 401.
- Trial + usage are **server-owned** (`supabase/trial_quota_setup.sql`). Clients get **read-only** access via RLS and can only call `extraction_status()` ("am I on trial? how many left today?"). They cannot pass a `user_id`, write the tables, or reset the trial — every mutation is inside a `SECURITY DEFINER` function that trusts only `auth.uid()`. Reinstalling the app changes nothing (state is on the account).

## Layer 2 — Hard per-account caps (the core)
- **Trial:** 7 days, **30 scans/day**. **Pro:** 200/day safety ceiling. **Expired:** 0.
- `consume_extraction()` does an atomic check-and-increment (`UPDATE … WHERE used < cap`), so concurrent requests can't exceed the cap.
- **Max a single free account can ever cost:** 7 days × 30 scans × ~$0.002 ≈ **$0.42, then it's dead.** That single fact is what makes farming uneconomic.

## Layer 3 — Make accounts expensive to create (defeats farming)
This is the answer to "a hacker makes thousands of trial users":
- **Sign in with Apple / Google ONLY** — no email/password, no anonymous auth. Real Apple/Google IDs are phone/payment-verified and slow to mass-create. This is the single biggest lever against farming.
- **Disable anonymous sign-ins** in Supabase Auth. If you ever add email signup, require verified email.
- **Store-side trial via RevenueCat/StoreKit:** Apple and Google each enforce *one free trial per store account per subscription group* — reinstalling or a new app install can't reset it.
- Math: with a $0.42 lifetime cap per account, burning **$100/day needs ~240 fresh Apple/Google IDs every day**, each doing 30 scans. Impractical, self-limiting, and easy to spot.

## Layer 4 — Only your real app can call the endpoint (kills scripting)
- Add **App Attest (iOS)** + **Play Integrity (Android)**. The app fetches an attestation token from Apple/Google proving it's your genuine, unmodified binary on a real device; the extract route verifies it. A curl script, a stolen JWT replayed from a server, or an emulator **cannot** produce a valid token → blocked. This is the strongest defense against direct endpoint abuse.

## Layer 5 — Edge rate limiting
- Add IP + per-user limits at the edge (Vercel middleware + Upstash Ratelimit, or Cloudflare in front). e.g. 60 req/min/IP and 40 scans/hour/user. A cheap backstop against bursts and stolen-token replay.

## Layer 6 — Global circuit breaker + hard spend cap (last line of defense)
- **Google Cloud: set a budget alert AND a hard daily quota** on the Gemini API key (requests/day). Even if every other layer fails, Google stops serving at your ceiling — this is the non-negotiable "cannot exceed $X/day" guarantee. Set it before launch.
- **App-level kill switch:** track total scans/day across all users; if it exceeds N× your expected peak, flip a DB/env flag that pauses extraction and alerts you. A malicious spike trips the breaker instead of your card.

## Layer 7 — Monitoring
- PostHog events: `receipt_scan_started`, `scan_blocked` (with reason), `daily_cap_hit`, plus signup rate. Alert on anomalies: spike in new accounts, spike in blocked scans, unusually high scans/user.
- Watch Supabase auth signups + RevenueCat for unusual patterns.

---

## Must-do before launch (checklist)
1. **Switch the app to the backend extract route** (`EXPO_PUBLIC_EXTRACT_URL`) and **remove `EXPO_PUBLIC_GEMINI_API_KEY` from production builds.** The dev direct-to-Gemini path bypasses *every* layer above — it must never ship. (Ticket #59.)
2. Run `supabase/trial_quota_setup.sql` in Supabase.
3. Set the **Google Cloud budget + hard daily quota** on the Gemini key.
4. Confirm **Apple/Google-only sign-in**; disable anonymous sign-in in Supabase.
5. (Strongly recommended) Add **App Attest / Play Integrity** verification to the extract route.
6. Downscale receipt images to ~1000–1600px before upload (halves per-scan cost).

## Note on the client trial cache
The app's `billingStore` trial is now just an **optimistic UI cache**. The **server is authoritative**: once the backend route is live, hydrate `billingStore` from `extraction_status()` on launch/focus so "days left / scans left today" always reflects the server, and the client can never grant itself access.
