-- ============================================================================
-- byeBills — shared access (owner / editor / viewer)
-- Run once in Supabase (SQL editor). Safe to re-run (idempotent).
--
-- Requires app_data_setup.sql + webapp_setup.sql.
--
-- Unlocks three things with one primitive:
--   · club treasurers   — committee + Revisoren see the Kassenbuch
--   · accountants       — the Treuhänder gets read-only access, no ZIP emails
--   · couples / partners — both scan into the same books
--
-- Design note: books stay keyed to the OWNER's user_id. Introducing a
-- workspace/account id instead would mean migrating every existing row and
-- changing the mobile app in lockstep. Widening the RLS policies achieves the
-- same result, and an owner-only user sees exactly what they saw before.
-- ============================================================================

create table if not exists public.app_shares (
  id             uuid primary key default gen_random_uuid(),

  -- Whose books are being shared.
  owner_user_id  uuid not null references auth.users (id) on delete cascade,

  -- Who they're shared with. Null until the invite is accepted — we can't know
  -- their user id before they've signed in.
  member_user_id uuid references auth.users (id) on delete cascade,

  invite_email   text not null,
  role           text not null check (role in ('editor', 'viewer')),
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'revoked')),

  -- Secret half of the invite link.
  token          text not null unique default encode(gen_random_bytes(24), 'hex'),

  created_at     timestamptz not null default now(),
  accepted_at    timestamptz
);

-- One live invite per person per owner. Revoked rows are kept for the audit
-- trail, so they're excluded rather than deleted.
create unique index if not exists app_shares_live_idx
  on public.app_shares (owner_user_id, lower(invite_email))
  where status <> 'revoked';

create index if not exists app_shares_member_idx
  on public.app_shares (member_user_id, status);

alter table public.app_shares enable row level security;

-- The owner manages their own invites.
drop policy if exists "owner manages shares" on public.app_shares;
create policy "owner manages shares" on public.app_shares
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- A member may see the shares granted TO them (so the app can list "books you
-- have access to"), but never modify them.
drop policy if exists "member reads own shares" on public.app_shares;
create policy "member reads own shares" on public.app_shares
  for select using (auth.uid() = member_user_id);

-- ---- Access predicates ------------------------------------------------------
-- SECURITY DEFINER matters: a policy on app_transactions that reads app_shares
-- would otherwise be filtered by app_shares' OWN policies, and the member
-- couldn't see the row that grants them access. Running as the table owner
-- sidesteps that. STABLE lets the planner call it once per statement.

create or replace function public.can_read_books(p_owner uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    p_owner = auth.uid()
    or exists (
      select 1 from public.app_shares s
      where s.owner_user_id = p_owner
        and s.member_user_id = auth.uid()
        and s.status = 'accepted'
    );
$$;

create or replace function public.can_write_books(p_owner uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    p_owner = auth.uid()
    or exists (
      select 1 from public.app_shares s
      where s.owner_user_id = p_owner
        and s.member_user_id = auth.uid()
        and s.status = 'accepted'
        and s.role = 'editor'
    );
$$;

grant execute on function public.can_read_books(uuid) to authenticated;
grant execute on function public.can_write_books(uuid) to authenticated;

-- ---- Re-point the data policies --------------------------------------------
-- The old "for all using (auth.uid() = user_id)" policies can't express
-- "readable by more people than may write", so each table gets four.

-- Transactions
drop policy if exists "own transactions" on public.app_transactions;
drop policy if exists "read transactions"   on public.app_transactions;
drop policy if exists "insert transactions" on public.app_transactions;
drop policy if exists "update transactions" on public.app_transactions;
drop policy if exists "delete transactions" on public.app_transactions;

create policy "read transactions" on public.app_transactions
  for select using (public.can_read_books(user_id));
create policy "insert transactions" on public.app_transactions
  for insert with check (public.can_write_books(user_id));
create policy "update transactions" on public.app_transactions
  for update using (public.can_write_books(user_id))
  with check (public.can_write_books(user_id));
create policy "delete transactions" on public.app_transactions
  for delete using (public.can_write_books(user_id));

-- Hustles
drop policy if exists "own hustles"    on public.app_hustles;
drop policy if exists "read hustles"   on public.app_hustles;
drop policy if exists "insert hustles" on public.app_hustles;
drop policy if exists "update hustles" on public.app_hustles;
drop policy if exists "delete hustles" on public.app_hustles;

create policy "read hustles" on public.app_hustles
  for select using (public.can_read_books(user_id));
create policy "insert hustles" on public.app_hustles
  for insert with check (public.can_write_books(user_id));
create policy "update hustles" on public.app_hustles
  for update using (public.can_write_books(user_id))
  with check (public.can_write_books(user_id));
create policy "delete hustles" on public.app_hustles
  for delete using (public.can_write_books(user_id));

-- Profile: readable by members (the books need the owner's currency and name),
-- writable only by the owner. A Treuhänder must not rename their client.
drop policy if exists "own profile"  on public.app_profiles;
drop policy if exists "read profile" on public.app_profiles;
drop policy if exists "write profile" on public.app_profiles;

create policy "read profile" on public.app_profiles
  for select using (public.can_read_books(user_id));
create policy "write profile" on public.app_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Modules stay owner-only. Connecting a shop means handing over API keys, and
-- that is not a decision a shared editor gets to make.

-- ---- Receipt images ---------------------------------------------------------
-- Objects live at "<owner_user_id>/<tx_id>.jpg". A member needs to see the
-- image behind a transaction they can already read, so the SELECT policy
-- follows the same predicate. Writes stay in the caller's own folder.
drop policy if exists "receipts read own" on storage.objects;
create policy "receipts read own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        -- Guard the cast: a stray non-uuid folder must not error the policy.
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        and public.can_read_books(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- ---- Accepting an invite ----------------------------------------------------
-- SECURITY DEFINER because the invitee cannot see a pending row (it has no
-- member_user_id yet, so neither policy matches).
--
-- The email must match: an invite link forwarded to the wrong person — or
-- leaked — must not hand over someone's financial records.
create or replace function public.accept_share(p_token text)
returns table (ok boolean, owner_user_id uuid, message text)
language plpgsql security definer set search_path = public as $$
declare
  v_share  public.app_shares%rowtype;
  v_email  text := lower(coalesce((auth.jwt() ->> 'email'), ''));
begin
  if auth.uid() is null then
    return query select false, null::uuid, 'not authenticated'; return;
  end if;

  select * into v_share from public.app_shares where token = p_token;

  if v_share.id is null then
    return query select false, null::uuid, 'invalid_token'; return;
  end if;
  if v_share.status = 'revoked' then
    return query select false, null::uuid, 'revoked'; return;
  end if;
  if v_share.owner_user_id = auth.uid() then
    return query select false, null::uuid, 'cannot_share_with_self'; return;
  end if;
  if v_email = '' or lower(v_share.invite_email) <> v_email then
    return query select false, null::uuid, 'email_mismatch'; return;
  end if;

  update public.app_shares
     set member_user_id = auth.uid(),
         status         = 'accepted',
         accepted_at    = now()
   where id = v_share.id;

  return query select true, v_share.owner_user_id, 'accepted';
end;
$$;

grant execute on function public.accept_share(text) to authenticated;

-- ---- "Whose books can I open?" ---------------------------------------------
-- Returns the owner's name/email alongside the id so the switcher can label
-- each entry — a member can't read app_profiles rows for owners generally,
-- only through this.
create or replace function public.shared_books()
returns table (owner_user_id uuid, owner_name text, role text)
language sql stable security definer set search_path = public as $$
  select s.owner_user_id,
         coalesce(nullif(p.name, ''), u.email, 'Shared books'),
         s.role
  from public.app_shares s
  left join public.app_profiles p on p.user_id = s.owner_user_id
  left join auth.users u          on u.id      = s.owner_user_id
  where s.member_user_id = auth.uid()
    and s.status = 'accepted';
$$;

grant execute on function public.shared_books() to authenticated;
