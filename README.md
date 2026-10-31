This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
