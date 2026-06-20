-- ============================================================================
-- Scaniha — Row Level Security & write-guards for the CORE tables.
-- Run ONCE in the Supabase dashboard → SQL Editor. Idempotent (safe to re-run).
--
-- WHY: the browser uses the anon key (lib/supabase/client.ts), so the database
-- is the real security boundary. Before this migration the core tables had no
-- committed RLS, which let any owner (or anyone with the public anon key):
--   • set their own businesses.status='active' / expires_at far in the future
--     → free lifetime access, bypassing the manual payment approval flow;
--   • set profiles.role='super_admin' → full platform takeover;
--   • read/update/delete OTHER businesses' rows, menus, and profiles.
--
-- This migration enables RLS + owner-scoped policies, and adds BEFORE triggers
-- that prevent the anon/authenticated role from writing the privileged columns.
-- The service-role key (used only by server API routes after auth checks, and by
-- the super-admin console) bypasses these guards, so admin flows keep working.
--
-- ⚠️ Verify the table/column names against your live schema before running.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) BUSINESSES — owners may edit content columns, never subscription/identity.
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;

-- Public menu pages (no session → anon) may read live menus only.
drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses
  for select using (status in ('active', 'paused'));

-- An owner can always read their own business (even when 'pending').
drop policy if exists businesses_owner_read on public.businesses;
create policy businesses_owner_read on public.businesses
  for select using (owner_id = auth.uid());

drop policy if exists businesses_owner_insert on public.businesses;
create policy businesses_owner_insert on public.businesses
  for insert with check (owner_id = auth.uid());

drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_owner_update on public.businesses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Guard: only the service role may set status/expires_at/owner_id/slug.
-- An authenticated owner who inserts gets at most a 7-day active trial; any
-- update they make can never change those columns.
create or replace function public.businesses_guard()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;  -- privileged server routes / super-admin console
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    if new.status = 'active' then
      -- cap any self-serve "active" to a 7-day trial, never lifetime
      new.expires_at := least(
        coalesce(new.expires_at, now() + interval '7 days'),
        now() + interval '7 days'
      );
    else
      new.status := 'pending';
      new.expires_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    new.status     := old.status;
    new.expires_at := old.expires_at;
    new.owner_id   := old.owner_id;
    new.slug       := old.slug;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_guard_trg on public.businesses;
create trigger businesses_guard_trg
  before insert or update on public.businesses
  for each row execute function public.businesses_guard();

-- ---------------------------------------------------------------------------
-- 2) PROFILES — a user manages only their own row, and can never set role.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Guard: non-privileged writers are pinned to role='owner' on their own row.
-- super_admins are provisioned only via the service role / SQL.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'owner';
    -- An authenticated end-user inserting via PostgREST is pinned to their own id.
    -- During signup the profile row is created by the auth.users trigger
    -- (SECURITY DEFINER, no JWT) where auth.uid() is null — keep the user_id it
    -- already set (= the new user's id) instead of overwriting it with null,
    -- which would violate the NOT NULL constraint and 500 the whole signup.
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    new.role := old.role;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- 3) CATEGORIES & ITEMS — public read for live menus, owner-scoped writes.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (
    business_id in (select id from public.businesses where status in ('active','paused'))
  );

drop policy if exists categories_owner_all on public.categories;
create policy categories_owner_all on public.categories
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

alter table public.items enable row level security;

drop policy if exists items_public_read on public.items;
create policy items_public_read on public.items
  for select using (
    category_id in (
      select c.id from public.categories c
      join public.businesses b on b.id = c.business_id
      where b.status in ('active','paused')
    )
  );

drop policy if exists items_owner_all on public.items;
create policy items_owner_all on public.items
  for all
  using (
    category_id in (
      select c.id from public.categories c
      join public.businesses b on b.id = c.business_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    category_id in (
      select c.id from public.categories c
      join public.businesses b on b.id = c.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4) MENU_VIEWS — analytics rows. Only the service role (server routes) touches
--    them; no anon/authenticated access at all (RLS on + no policies = deny).
-- ---------------------------------------------------------------------------
alter table public.menu_views enable row level security;

-- ---------------------------------------------------------------------------
-- 5) IMAGES — gallery sync table. Public may read everything EXCEPT payment
--    receipts (receipts/<businessId>/...); writes only via the service role.
--    Adjust the column checks if your `images` schema differs.
-- ---------------------------------------------------------------------------
alter table public.images enable row level security;

drop policy if exists images_public_read_nonreceipt on public.images;
create policy images_public_read_nonreceipt on public.images
  for select using (
    coalesce(folder, '')    not ilike 'receipts%'
    and coalesce(public_id, '') not ilike 'receipts/%'
  );

commit;

-- ============================================================================
-- After running: TEST that the dashboard still works (edit menu name/color,
-- add a category/item) and that a public menu loads. The game/loyalty/payment
-- tables are already covered by game.sql / payment_requests.sql.
-- ============================================================================
