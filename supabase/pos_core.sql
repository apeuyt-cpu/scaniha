-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha POS — CORE (branches, staff+roles, catalog). Separate product.
-- Reuses the `businesses` row as the ORGANISATION (account/billing/auth root).
-- Forks the proven RLS + SECURITY-DEFINER patterns from orders.sql / staff_pins.sql.
-- Idempotent. Apply:  node scripts/apply-sql-api.mjs supabase/pos_core.sql
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── branches: the physical points of sale under one organisation ─────────────
create table if not exists public.pos_branches (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  code        text,                         -- short prefix for ticket numbers (e.g. 'LAC')
  address     text,
  phone       text,
  status      text not null default 'active' check (status in ('active','paused','archived')),
  is_primary  boolean not null default false,
  timezone    text not null default 'Africa/Tunis',
  settings    jsonb not null default '{}'::jsonb,   -- per-branch POS config merged over org
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pos_branches_biz on public.pos_branches (business_id, status);
create unique index if not exists pos_branches_code on public.pos_branches (business_id, lower(code)) where code is not null;

-- ── staff: PIN identity + role + branch (fork of staff_pins, NOT shared) ─────
create table if not exists public.pos_staff (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  branch_id     uuid references public.pos_branches(id) on delete cascade,  -- null = all branches (owner/manager)
  label         text not null,
  pin_hash      text not null,
  role          text not null default 'cashier' check (role in ('cashier','manager','owner')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
create index if not exists pos_staff_biz on public.pos_staff (business_id) where active;
create index if not exists pos_staff_branch on public.pos_staff (branch_id) where active;
create unique index if not exists pos_staff_label on public.pos_staff (business_id, label) where active;

-- ── catalog: real POS products (price NOT NULL, SKU, tax) ────────────────────
create table if not exists public.pos_products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id   uuid references public.pos_branches(id) on delete cascade,  -- null = shared across branches
  category    text,
  name        text not null,
  sku         text,
  price       numeric(10,3) not null,
  tax_rate    numeric(5,3) not null default 0,
  color       text,
  image_url   text,
  available   boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pos_products_biz on public.pos_products (business_id, available, sort);
create index if not exists pos_products_sku on public.pos_products (business_id, sku) where sku is not null;

create table if not exists public.pos_product_modifiers (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.pos_products(id) on delete cascade,
  group_label text not null,
  options     jsonb not null default '[]'::jsonb,   -- [{ label, priceDelta }]
  required    boolean not null default false,
  multi       boolean not null default false,
  sort        int not null default 0
);
create index if not exists pos_product_modifiers_product on public.pos_product_modifiers (product_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create or replace function public.pos_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists pos_branches_touch on public.pos_branches;
create trigger pos_branches_touch before update on public.pos_branches for each row execute function public.pos_touch();
drop trigger if exists pos_products_touch on public.pos_products;
create trigger pos_products_touch before update on public.pos_products for each row execute function public.pos_touch();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- branches + catalog: owner manages own org; super-admin all. staff: locked
-- (service-role / SECURITY DEFINER only, exactly like staff_pins).
alter table public.pos_branches enable row level security;
alter table public.pos_products enable row level security;
alter table public.pos_product_modifiers enable row level security;
alter table public.pos_staff enable row level security;

drop policy if exists pos_branches_owner on public.pos_branches;
create policy pos_branches_owner on public.pos_branches for all
  using (exists (select 1 from public.businesses b where b.id = pos_branches.business_id and b.owner_id = auth.uid()));
drop policy if exists pos_branches_super on public.pos_branches;
create policy pos_branches_super on public.pos_branches for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists pos_products_owner on public.pos_products;
create policy pos_products_owner on public.pos_products for all
  using (exists (select 1 from public.businesses b where b.id = pos_products.business_id and b.owner_id = auth.uid()));
drop policy if exists pos_products_super on public.pos_products;
create policy pos_products_super on public.pos_products for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists pos_modifiers_owner on public.pos_product_modifiers;
create policy pos_modifiers_owner on public.pos_product_modifiers for all
  using (exists (select 1 from public.pos_products pp join public.businesses b on b.id = pp.business_id
                 where pp.id = pos_product_modifiers.product_id and b.owner_id = auth.uid()));
drop policy if exists pos_modifiers_super on public.pos_product_modifiers;
create policy pos_modifiers_super on public.pos_product_modifiers for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));
-- pos_staff: NO public policies (service-role only via SECURITY DEFINER fns).

-- ── ensure_primary_branch: idempotent — every org gets exactly one primary ───
create or replace function public.pos_ensure_primary_branch(p_business uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.pos_branches where business_id = p_business order by is_primary desc, created_at asc limit 1;
  if v_id is null then
    insert into public.pos_branches (business_id, name, is_primary)
      values (p_business, coalesce(nullif(btrim(p_name), ''), 'Principal'), true)
      returning id into v_id;
  end if;
  return v_id;
end; $$;

-- ── pos_verify_staff_pin: constant-work, returns role (forked from staff_pins) ─
create or replace function public.pos_verify_staff_pin(p_business uuid, p_branch uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  v_hit record;
  v_fmt boolean := (p_pin is not null and p_pin ~ '^[0-9]{4,6}$');
  v_dummy constant text := '$2a$06$0000000000000000000000000000000000000000000000000000a';
  v_any boolean := false;
begin
  for r in select id, label, role, branch_id, pin_hash from public.pos_staff
           where business_id = p_business and active = true
             and (branch_id is null or p_branch is null or branch_id = p_branch) loop
    v_any := true;
    if v_fmt and r.pin_hash = crypt(coalesce(p_pin, ''), r.pin_hash) then v_hit := r; end if;
  end loop;
  if not v_any then perform crypt(coalesce(p_pin, ''), v_dummy); end if;
  if v_fmt and v_hit.id is not null then
    update public.pos_staff set last_login_at = now() where id = v_hit.id;
    return jsonb_build_object('ok', true, 'staffId', v_hit.id, 'label', v_hit.label, 'role', v_hit.role, 'branchId', v_hit.branch_id);
  end if;
  return jsonb_build_object('ok', false);
end; $$;

-- ── pos_create_staff (forked from create_staff_pin, + role/branch) ───────────
create or replace function public.pos_create_staff(p_business uuid, p_branch uuid, p_label text, p_pin text, p_role text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_label text; v_role text; v_created timestamptz;
begin
  v_label := nullif(btrim(coalesce(p_label, '')), '');
  v_role := lower(coalesce(p_role, 'cashier'));
  if v_label is null then return jsonb_build_object('ok', false, 'error', 'label'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then return jsonb_build_object('ok', false, 'error', 'weak'); end if;
  if v_role not in ('cashier','manager','owner') then v_role := 'cashier'; end if;
  if exists(select 1 from public.pos_staff where business_id = p_business and label = v_label and active = true) then
    return jsonb_build_object('ok', false, 'error', 'duplicate_label');
  end if;
  insert into public.pos_staff (business_id, branch_id, label, pin_hash, role)
    values (p_business, p_branch, v_label, crypt(p_pin, gen_salt('bf')), v_role)
    returning id, created_at into v_id, v_created;
  return jsonb_build_object('ok', true, 'id', v_id, 'label', v_label, 'role', v_role, 'branchId', p_branch, 'active', true, 'created_at', v_created);
end; $$;

-- ── grants ───────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.pos_ensure_primary_branch(uuid,text)',
    'public.pos_verify_staff_pin(uuid,uuid,text)',
    'public.pos_create_staff(uuid,uuid,text,text,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
