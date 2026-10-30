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
- A small provider abstraction for the LLM (`src/lib/llm`), so Gemini can be swapped for another model

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Google Gemini · PostHog · Vercel

## Project structure

```
src/
  app/            pages and API routes (app router)
    api/          extract, mobile/extract, waitlist, transactions, auth, account
    drop/         invoice drop demo
  components/     UI components
  lib/
    llm/          LLM provider interface, Gemini implementation, extraction prompt
    supabase/     browser, server and service-role clients
    sync/         Google Sheets export (not wired up yet)
supabase/         SQL for the tables, RLS policies and quota functions
docs/             notes on the abuse protection
```

## Running it locally

You need Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Run the SQL files in `supabase/` in the Supabase SQL editor to create the tables. After that the site runs on http://localhost:3000.

## License

MIT
