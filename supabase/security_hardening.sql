-- ============================================================================
-- byeBills — security hardening (RLS for the web tables + rate limiting)
-- NOT applied automatically. Run once in the Supabase SQL editor. Idempotent.
--
-- BEFORE RUNNING: in Supabase -> Authentication -> Policies (or
--   select * from pg_policies where schemaname = 'public';)
-- check which RLS state / policies already exist on users, businesses and
-- transactions. Policies are permissive and OR-ed together, so an old, too-wide
-- policy (e.g. "using (true)") would still defeat the ones below — drop it.
-- The web tables were created outside this repo, so this file is the first
-- versioned definition of their access rules.
--
-- Part 1: own-rows RLS for users / businesses / transactions
--         (mirrors the app_* policies in app_data_setup.sql).
-- Part 2: rate_limits table + rate_limit_hit() used by /api/waitlist,
--         /api/extract-demo and /api/auth/signup (service role only).
-- ============================================================================

-- ---- Part 1: RLS ------------------------------------------------------------
-- Guarded with to_regclass so the script doesn't fail if a table is absent.
do $$
begin
  if to_regclass('public.users') is not null then
    alter table public.users enable row level security;
    drop policy if exists "own profile" on public.users;
    create policy "own profile" on public.users
      for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  if to_regclass('public.businesses') is not null then
    alter table public.businesses enable row level security;
    drop policy if exists "own businesses" on public.businesses;
    create policy "own businesses" on public.businesses
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if to_regclass('public.transactions') is not null then
    alter table public.transactions enable row level security;
    drop policy if exists "own transactions via business" on public.transactions;
    -- transactions have no user_id: ownership is derived from the business.
    create policy "own transactions via business" on public.transactions
      for all
      using (exists (
        select 1 from public.businesses b
        where b.id = transactions.business_id and b.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.businesses b
        where b.id = transactions.business_id and b.user_id = auth.uid()
      ));
  end if;
end $$;
-- Server code that needs to bypass RLS (signup profile upsert, waitlist,
-- account deletion) uses the service role, which is unaffected by RLS.

-- ---- Part 2: rate limiting ---------------------------------------------------
-- Fixed-window counter per key (e.g. 'waitlist:1.2.3.4'), kept in Postgres so it
-- works across serverless instances.
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
alter table public.rate_limits enable row level security;  -- no policies: no client access

-- Returns true if the request is allowed.
--   p_increment = 1 (default): count this hit, allowed while count <= p_max.
--   p_increment = 0: only peek, allowed while count <  p_max.
create or replace function public.rate_limit_hit(
  p_key text, p_max int, p_window_seconds int, p_increment int default 1
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  -- opportunistic cleanup of stale keys
  delete from public.rate_limits where window_start < now() - interval '1 day';

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), p_increment)
  on conflict (key) do update
    set window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start end,
        count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then p_increment
          else r.count + p_increment end
  returning r.count into v_count;

  if p_increment = 0 then
    return v_count < p_max;
  end if;
  return v_count <= p_max;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.rate_limit_hit(text, int, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int, int) to service_role;
