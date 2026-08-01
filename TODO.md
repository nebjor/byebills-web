# TODO & Notes — byebills webapp

Working notes and open action items. Last reviewed: 2026-08-01.

## Security review — status: SAFE to make public

Scanned all tracked files and the complete git history (all branches):

- [x] `.env.local` is gitignored (`.env*` plus an explicit `.env.local` line) and was **never committed** — verified across every branch and the full history.
- [x] No hardcoded secrets in tracked code or history. Every `SUPABASE_SERVICE_ROLE_KEY` occurrence is `process.env.…` (read at runtime), not a literal key.
- [x] Supabase SQL setup files and the PostHog setup report contain no keys.

### Before flipping the repo public
- [ ] Remove the stray backup file: `git rm page.backup.tsx` (not a secret, just looks sloppy in a public repo).
- [ ] Decide whether `ANTI_ABUSE.md` should be public — it documents abuse-prevention logic, which can hand people a way around it.
- [ ] Confirm **Row Level Security (RLS)** is enabled on all Supabase tables. The Supabase URL + anon key already ship in the browser bundle, so RLS — not key secrecy — is what actually protects the data.
- [ ] (Optional) Restrict the Gemini API key in Google Cloud (API + HTTP-referrer restrictions) so a future slip stays contained.

## Secrets — where they live
- **Real secrets** (only in `.env.local`, never pushed): Supabase **service_role** key, **Gemini** API key.
- **Public by design** (already in the shipped site's JS): `NEXT_PUBLIC_SUPABASE_URL`, anon / publishable keys, PostHog project token.
- Rule: never `git add -f .env.local`, and never drop `.env*` from `.gitignore`.

## Continuing on another machine
`.env.local` is **not** in git, so a fresh clone won't have it — recreate it:
1. `git clone https://github.com/nebjor/byebills.git`
2. `npm install`
3. Create `.env.local` from `.env.example`, filling in the real values (copy the file over directly, or pull the keys from your password manager / the Supabase + Google Cloud dashboards).
4. `npm run dev`

## Where I left off (last session)
Mid-change across the extraction / demo-drop flow:
- `src/app/api/extract-demo/route.ts`, `src/lib/extraction.ts` — extraction logic
- `src/app/drop/page.tsx`, `src/components/invoice-drop.tsx` — drop UI
- `src/app/login/page.tsx`, `src/components/books-summary.tsx`
