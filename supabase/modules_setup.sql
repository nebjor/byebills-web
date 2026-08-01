-- ============================================================================
-- byeBills — customer-toggleable modules
-- Run once in Supabase (SQL editor). Safe to re-run (idempotent).
--
-- Requires app_data_setup.sql + webapp_setup.sql.
--
-- A "module" is an optional capability a customer switches on for themselves:
-- a webshop feed, a Google Sheets mirror, an accountant share. The row IS the
-- switch — no row (or active = false) means the module does nothing.
--
-- This replaces the older `integrations` table, which was keyed to the v1
-- `businesses` table the app no longer uses.
-- ============================================================================

create table if not exists public.app_integrations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,

  -- Which module. Matched against the registry in src/lib/app/modules.ts.
  type         text not null,

  -- Which hustle its data belongs to. Null = "ask me each time".
  hustle_id    text,

  -- The switch the customer controls.
  active       boolean not null default false,

  -- Module-specific settings (shop URL, spreadsheet id, …).
  -- NEVER put long-lived secrets here: this row is readable by the browser
  -- under RLS. Secrets go in app_integration_secrets below.
  config       jsonb not null default '{}'::jsonb,

  -- Last run outcome, so the UI can show something honest instead of a
  -- green dot that means nothing.
  status       text not null default 'idle',   -- idle | ok | error
  last_sync_at timestamptz,
  last_error   text,
  cursor       text,                            -- resume point (e.g. last payout id)

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One connection per module per hustle.
  unique (user_id, type, hustle_id)
);

create index if not exists app_integrations_user_idx
  on public.app_integrations (user_id, active);

alter table public.app_integrations enable row level security;

drop policy if exists "own integrations" on public.app_integrations;
create policy "own integrations" on public.app_integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Secrets, held separately -----------------------------------------------
-- API keys and OAuth refresh tokens must never reach the browser. Same-row
-- storage would expose them to any client that can read its own integration,
-- so they live in a table with RLS on and NO policies: only the service role
-- (i.e. our server routes) can read or write them.
create table if not exists public.app_integration_secrets (
  integration_id uuid primary key
                 references public.app_integrations (id) on delete cascade,
  secrets        jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.app_integration_secrets enable row level security;
-- Deliberately no policies. Service role only.

-- ---- Run log ----------------------------------------------------------------
-- What a module did and when. Users can read their own history; only the
-- server writes it.
create table if not exists public.app_integration_runs (
  id             uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.app_integrations (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  ok             boolean,
  imported       int not null default 0,
  message        text
);

create index if not exists app_integration_runs_idx
  on public.app_integration_runs (user_id, started_at desc);

alter table public.app_integration_runs enable row level security;

drop policy if exists "read own runs" on public.app_integration_runs;
create policy "read own runs" on public.app_integration_runs
  for select using (auth.uid() = user_id);
-- No insert/update policy => only the service role writes run history.

-- ---- Idempotency ------------------------------------------------------------
-- An imported payout must never double-book, however many times a webhook
-- fires or a poll re-runs. app_transactions.id is a text PK per user, so a
-- deterministic id derived from the source event ("stripe:po_1abc") makes the
-- insert naturally idempotent — the primary key does the deduplication.
--
-- Connectors MUST build ids that way rather than using a random uuid.
comment on table public.app_integrations is
  'Customer-toggleable modules. Connectors derive app_transactions.id from the
   source event id (e.g. "stripe:po_1abc") so re-running an import is a no-op.';
