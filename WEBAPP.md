# byeBills web app (`/app`) — setup & architecture

The hidden, cross-platform web twin of the mobile app. Reachable only by typing
`byebills.app/app`; nothing on the landing page links to it and it's `noindex`.

---

## What had to be true for this to work

The mobile app and the web app **share literal database rows**. That's the whole
point — a receipt scanned on the phone appears on the web without a refresh.
Three things make that possible:

1. **Same Supabase project → same `auth.uid()`.** Mobile signs in natively and
   hands Supabase an ID token (`signInWithIdToken`); the web uses the OAuth
   redirect flow (`signInWithOAuth` + `/auth/callback`). Different mechanism,
   same identity.
2. **Shared tables.** Both clients read/write `app_profiles`, `app_hustles` and
   `app_transactions` — the mobile-shaped tables, not the older v1
   `businesses`/`transactions` pair (which the web app deliberately does not
   touch).
3. **Onboarding state lives on the server** (`app_profiles.onboarded_at`), not
   in localStorage/AsyncStorage. Onboard on the phone, and the web sends you
   straight to the dashboard.

---

## Setup

### 1. Run the SQL

In the Supabase SQL editor, in order (all idempotent, safe to re-run):

```
supabase/app_data_setup.sql    -- app_hustles, app_transactions, receipts bucket
supabase/trial_quota_setup.sql -- entitlements + consume_extraction()
supabase/webapp_setup.sql      -- app_profiles, realtime publication, demo cap
```

`webapp_setup.sql` is new. It adds:
- `app_profiles` (+ a signup trigger that prefills the name from the OAuth
  provider, and a backfill for existing accounts)
- `app_transactions` / `app_hustles` added to the `supabase_realtime`
  publication — **without this, realtime silently never fires**
- `replica identity full` so deletes propagate across devices
- `demo_usage` + `consume_demo_extraction()` for the public `/drop` cap

### 2. Enable the OAuth providers

Supabase dashboard → Authentication → Providers → enable **Google** (and Apple,
if you want the button to work on the web too).

Then Authentication → URL Configuration → **Redirect URLs**, add both:

```
http://localhost:3000/auth/callback
https://www.byebills.app/auth/callback
```

Sign-in fails with a redirect error if these are missing.

### 3. Environment variables

Already required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY`.

New, optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DROP_DEMO_DAILY_CAP` | `200` | Global daily ceiling on `/api/extract-demo` |

---

## Routes

| Route | What it is |
| --- | --- |
| `/app/login` | Google / Apple sign-in (the only public path under `/app`) |
| `/app/onboarding` | Two steps, ported from mobile: name + currency, then hustles |
| `/app` | Dashboard — balance, per-hustle totals, recent entries |
| `/app/transactions` | Full ledger with search + income/expense/hustle filters |
| `/app/scan` | Drop zone — parallel extraction, review, save |
| `/app/reports` | Monthly + per-hustle totals, CSV export |
| `/app/profile` | Name, currency, hustles, dark mode, sign out |
| `/auth/callback` | OAuth code exchange |

`src/middleware.ts` is scoped to `/app/:path*` **only**. The landing page,
`/drop`, `/privacy` and `/terms` never hit it — changing that matcher will
change what anonymous visitors see on the marketing site.

---

## Gemini spend is now capped on every path

Before this change, only `/api/mobile/extract` enforced quota. Two web paths
called Gemini with no ceiling at all.

| Endpoint | Auth | Cap |
| --- | --- | --- |
| `/api/mobile/extract` | Bearer token | `consume_extraction()` — per user |
| `/api/app/extract` | Session cookie | `consume_extraction()` — per user **(new)** |
| `/api/extract` (legacy) | Session cookie | `consume_extraction()` — per user **(new)** |
| `/api/extract-demo` | Shared password | `consume_demo_extraction()` — global/day **(new)** |

All of them **reserve before** spending and **refund on failure**, so our errors
never cost a user a scan. The rules live in Postgres, not the app, so no client
can bypass them.

---

## Known gap: the mobile app doesn't write to the server yet

`byebills-app/src/data/store.tsx` persists transactions to **AsyncStorage
only** — Supabase is used there for auth and the quota RPC and nothing else.

So today the sync is one-directional in practice: the web app writes shared rows
and will render mobile's the instant they exist, but mobile isn't producing them
yet. Closing the loop is a change in the **`nebjor/byebills-app`** repo: point
`store.tsx` / `hustleStore.tsx` / `userStore.tsx` at `app_transactions`,
`app_hustles` and `app_profiles`, and upload the receipt photo to the `receipts`
bucket instead of keeping a device-local `file://` URI.
