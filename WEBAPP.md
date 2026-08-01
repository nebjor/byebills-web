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
supabase/sharing_setup.sql     -- app_shares + widened RLS  (run BEFORE modules)
supabase/modules_setup.sql     -- app_integrations + secrets + run log
```

`sharing_setup.sql` **replaces** the per-table `own …` policies with read/write
pairs. Run it before `modules_setup.sql`, and re-run it if you ever re-run
`app_data_setup.sql` (which would restore the narrower policies).

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
| `/app/people` | Invite an accountant / partner / auditor; open books shared with you |
| `/app/join/[token]` | Accept an invite |
| `/app/modules` | Switch connections on and off |
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

---

## Shared access

Three roles. `owner` isn't stored — it's what you are for your own books.

| Role | Can |
| --- | --- |
| owner | everything, including inviting people and connecting modules |
| editor | read + scan + edit entries (partner, co-founder) |
| viewer | read only (Treuhänder, club Revisor) |

Books stay keyed to the owner's `user_id`; the RLS policies widen rather than a
workspace id being introduced. That keeps the mobile app working untouched and
avoids migrating every existing row.

Invites are **email-bound**: `accept_share()` requires the signed-in email to
match the invited address, so a forwarded link can't hand over someone's
financial records. There's no invite email yet — the owner copies the link from
`/app/people` and sends it themselves.

`?books=<owner_id>` switches which books are on screen. A forged value falls
back to your own books, because RLS returns nothing for an owner you have no
share with.

---

## Modules

Customers switch these on themselves at `/app/modules`.

| Module | Direction | Status |
| --- | --- | --- |
| Stripe payouts | in | live |
| Shopify | in | live |
| WooCommerce · Medusa | in | declared, no connector yet |
| Google Sheets · Accountant access | out | declared, no connector yet |

**Credentials never reach the browser.** `app_integrations.config` is
client-readable under RLS, so API keys go to `app_integration_secrets` — RLS on,
deliberately *no policies*, service-role only — written via `/api/app/modules`.

**The accounting model:** connectors import **payouts, not orders**. One
settlement becomes two entries — gross takings as income, platform fees as an
expense — which nets to the figure on the bank statement. A shop doing 500
orders a month would otherwise put 500 rows in a ledger meant to be read by a
human.

**Idempotency:** `app_transactions.id` is derived from the source event
(`stripe:po_1abc`), so a re-run or a replayed webhook collides on the primary
key instead of double-booking income. Imports use `ignoreDuplicates` so an
entry the user has since edited isn't overwritten.

Imports are currently **manual** — "Import now" on the settings screen. Putting
them on a schedule means pointing a Vercel cron at `/api/app/modules/sync` and
adding a service-to-service auth check; the route today authenticates a signed-in
owner.

### Stripe setup

Create a **restricted key** (Developers → API keys → restricted) with read
access to **Payouts** and **Balance transactions**. Nothing else is needed.
Works whatever the shop is built on — Shopify, Woo, Medusa or custom — as long
as it settles through Stripe.

### Shopify setup

Create a custom app in the Shopify admin with the
`read_shopify_payments_payouts` scope and paste the Admin API access token. Only
useful if the shop uses **Shopify Payments**; if it settles via Stripe, use the
Stripe module instead.

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
