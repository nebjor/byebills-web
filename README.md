# byeBills

Landing page and backend API for **byeBills**, a receipt scanner and bookkeeper for people with a side hustle. You take a photo of a receipt or invoice, an LLM pulls out the important fields (amount, VAT, date, counterparty, ...) and it ends up as a transaction in your books.

Live: [byebills.app](https://www.byebills.app)

This repo has the Next.js site and the API used by both the web app and the mobile app (the mobile app is in a separate repo).

## What's in here

- **Landing page** with a waitlist backed by Supabase, a live "spots left" counter and an A/B test for the headline (PostHog feature flags)
- **Receipt extraction**: images/PDFs go to Gemini with a prompt tuned for Swiss receipts (DD.MM.YYYY dates, CHF, VAT, TWINT) and come back as structured JSON
- **Mobile API** (`/api/mobile/extract`): authenticated with the user's Supabase JWT, with a quota enforced on the server
- **Trial and quota system** written in Postgres: 7-day trial, 30 scans per day, atomic check-and-increment in `SECURITY DEFINER` functions, Row Level Security on all tables. Details are in [docs/anti-abuse.md](docs/anti-abuse.md)
- **/drop**: a password-protected demo where you can drop a batch of invoices and get a statement and a CSV export
- A small provider abstraction for the LLM (`src/server/extraction/llm`), so Gemini can be swapped for another model

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Google Gemini · PostHog · Vercel

## Running it locally

You need Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Run the SQL files in `supabase/` in the Supabase SQL editor to create the tables. After that the site runs on http://localhost:3000.

## Architecture

```
src/
  app/                    Next.js App Router (routing only, no business logic)
    (marketing)/          Landing page, /privacy, /terms
    (app)/                /login, /drop (demo), /books
    api/**/route.ts       Thin HTTP handlers: parse/validate -> auth -> call src/server -> respond
  components/             React UI components
  server/                 Backend logic, NO Next.js imports (unit-testable)
    extraction/           Upload -> quota -> LLM (llm/ = Gemini provider) -> duplicate check
    transactions/         zod field whitelist + insert with ownership check
    auth.ts               Bearer-token auth, service-role client, profile upsert
    uploads.ts quota.ts   Pure rules: file size/MIME whitelist, quota decision
    rate-limit*.ts        Postgres-backed rate limiting (see below)
    waitlist*.ts account.ts errors.ts analytics.ts
  lib/                    Shared helpers, clients and types (supabase/, books, database.types, http)
supabase/                 SQL to run manually in Supabase (nothing is applied automatically)
```

Rules of thumb: routes stay thin; anything with logic goes in `src/server/`. `*.test.ts`
files next to the code run with `npm test` (Node's built-in runner), so the pure modules they
import use explicit `.ts` relative imports and avoid the `@/` alias.
`/api/mobile/extract` and `/api/account/delete` are a contract with `nebjor/byebills-mobile`:
keep their URLs and response shapes unchanged.

Rate limiting (`/api/waitlist`, `/api/extract-demo`, `/api/auth/signup`) is keyed on the client
IP (`x-forwarded-for`, set by Vercel) and stored in Postgres via `rate_limit_hit()`
(`supabase/security_hardening.sql`). Limitations: it fails open if Supabase or the function is
unavailable, and IP-based limits can be evaded with many IPs. For stronger protection add Vercel
Firewall rate limits.

Scripts: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (all run in CI).

## License

MIT
