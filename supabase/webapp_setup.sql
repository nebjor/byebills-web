-- ============================================================================
-- byeBills — cross-platform web app setup
-- Run once in Supabase (SQL editor). Safe to re-run (idempotent).
--
-- Requires app_data_setup.sql to have been run first (app_hustles,
-- app_transactions, receipts bucket).
--
-- Adds:
--   1. app_profiles      — name + currency + onboarding state, shared by web
--                          and mobile so a user onboards ONCE, not per device.
--   2. realtime          — publishes app_transactions so the web app sees a
--                          mobile scan appear without a refresh.
--   3. demo_usage        — a global daily cap on the public /drop demo, so the
--                          shared password can't be used to burn the Gemini
--                          budget.
-- ============================================================================

-- ---- 1. Profile (the thing mobile keeps in AsyncStorage today) -------------
-- Onboarding is derived from server state, never localStorage: a user who
-- onboarded on the phone must not be asked again on the web.
create table if not exists public.app_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  name         text not null default '',
  currency     text not null default 'CHF',
  onboarded_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.app_profiles enable row level security;

drop policy if exists "own profile" on public.app_profiles;
create policy "own profile" on public.app_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create the profile row at signup so the client never races on first write.
create or replace function public.handle_new_app_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_profiles (user_id, name)
  values (
    new.id,
    -- Prefill the name from the OAuth provider when it gave us one.
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_app_profile();

-- Backfill for accounts that already exist (e.g. everyone testing the app now).
insert into public.app_profiles (user_id, name)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
from auth.users u
on conflict (user_id) do nothing;

-- ---- 2. Realtime -----------------------------------------------------------
-- Without this, .channel(...).on('postgres_changes', ...) silently never fires.
-- `add table` errors if the table is already published, so guard it.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_transactions'
  ) then
    alter publication supabase_realtime add table public.app_transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_hustles'
  ) then
    alter publication supabase_realtime add table public.app_hustles;
  end if;
end $$;

-- Realtime respects RLS, but only sends the full old-row on delete when the
-- table has a replica identity. Without this a delete on one device leaves a
-- ghost row on the other.
alter table public.app_transactions replica identity full;
alter table public.app_hustles      replica identity full;

-- ---- 3. Public demo cap ----------------------------------------------------
-- /api/extract-demo is behind a single shared password with no user identity,
-- so per-user quota can't apply. This is a crude global ceiling on the number
-- of demo extractions per UTC day — enough to bound the worst-case Gemini bill
-- if the password leaks.
create table if not exists public.demo_usage (
  day  date primary key,
  used int  not null default 0
);

alter table public.demo_usage enable row level security;
-- No policies => only the service role can touch it.

create or replace function public.consume_demo_extraction(p_cap int)
returns table (allowed boolean, used int, cap int)
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_used  int;
begin
  insert into public.demo_usage (day, used) values (v_today, 0)
  on conflict (day) do nothing;

  -- Atomic check-and-increment: concurrent requests can never exceed the cap.
  update public.demo_usage
     set used = used + 1
   where day = v_today and used < p_cap
  returning used into v_used;

  if v_used is null then
    select d.used into v_used from public.demo_usage d where d.day = v_today;
    return query select false, coalesce(v_used, p_cap), p_cap;
  else
    return query select true, v_used, p_cap;
  end if;
end;
$$;

revoke all on function public.consume_demo_extraction(int) from anon, authenticated;
