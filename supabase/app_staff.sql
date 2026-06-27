-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha — UNIFIED STAFF (P0 foundation): one staff identity used everywhere
-- (admin + POS + fidélité). Merges staff_pins (caisse) + pos_staff (POS) into
-- app_staff (identity + role + per-staff permission overrides + per-staff PIN
-- lockout). Immutable staff_audit ("who did what"). bcrypt PINs are COPIED from
-- the old tables (same pgcrypto), never re-entered. INERT until the session layer
-- is wired — applying this changes NO current behaviour.
-- Apply:  node scripts/apply-sql-api.mjs supabase/app_staff.sql
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.app_staff (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  branch_id       uuid references public.pos_branches(id) on delete set null,  -- null = all branches
  label           text not null,
  pin_hash        text not null,
  role            text not null default 'cashier' check (role in ('cashier','server','manager','owner')),
  permissions     jsonb not null default '{}'::jsonb,   -- { allow:[cap...], deny:[cap...] } overrides
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz,
  failed_attempts int not null default 0,
  locked_until    timestamptz
);
create unique index if not exists app_staff_label on public.app_staff (business_id, lower(label)) where active;
create index if not exists app_staff_biz on public.app_staff (business_id) where active;

-- Immutable audit (distinct from audit_log, which skips service-role writes and
-- can't attribute the staff). Written INSIDE the sensitive RPCs (same txn).
create table if not exists public.staff_audit (
  id            bigint generated always as identity primary key,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  branch_id     uuid,
  actor_staff   uuid references public.app_staff(id) on delete set null,  -- null = owner direct
  actor_label   text,                                  -- dénormalisé, survit à la suppression
  action        text not null,
  target_table  text,
  target_id     text,
  amount        numeric(12,3),
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists staff_audit_biz_time on public.staff_audit (business_id, created_at desc);
create index if not exists staff_audit_actor on public.staff_audit (business_id, actor_staff, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- app_staff: NO public policies (service-role + SECURITY DEFINER only, like pos_staff).
-- staff_audit: owner/super-admin can READ; nobody can update/delete; inserts only via RPC.
alter table public.app_staff enable row level security;
alter table public.staff_audit enable row level security;

drop policy if exists staff_audit_owner_select on public.staff_audit;
create policy staff_audit_owner_select on public.staff_audit for select
  using (exists (select 1 from public.businesses b where b.id = staff_audit.business_id and b.owner_id = auth.uid()));
drop policy if exists staff_audit_super_select on public.staff_audit;
create policy staff_audit_super_select on public.staff_audit for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

-- triple immutability: block UPDATE/DELETE even for service-role
create or replace function public.staff_audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'staff_audit is append-only'; end; $$;
drop trigger if exists staff_audit_no_mutate on public.staff_audit;
create trigger staff_audit_no_mutate before update or delete on public.staff_audit
  for each row execute function public.staff_audit_immutable();

-- ── staff_verify_pin: per-staff verify + lockout (the lock screen lists staff,
-- the employee taps theirs, then enters the PIN → we know WHO, so lockout is
-- per-staff). Constant-work bcrypt; escalating lockout 5→5min, 10→60min. ──────
create or replace function public.staff_verify_pin(p_business uuid, p_staff uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
  v_fmt boolean := (p_pin is not null and p_pin ~ '^[0-9]{4,6}$');
  v_dummy constant text := '$2a$06$0000000000000000000000000000000000000000000000000000a';
  v_ok boolean := false;
begin
  select * into s from public.app_staff where id = p_staff and business_id = p_business and active = true;
  if s.id is null then
    perform crypt(coalesce(p_pin, ''), v_dummy);  -- equalize timing
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'lockedUntil', s.locked_until);
  end if;

  if v_fmt and s.pin_hash = crypt(p_pin, s.pin_hash) then v_ok := true; end if;

  if v_ok then
    update public.app_staff set failed_attempts = 0, locked_until = null, last_login_at = now() where id = s.id;
    return jsonb_build_object('ok', true, 'staffId', s.id, 'label', s.label, 'role', s.role, 'branchId', s.branch_id);
  else
    update public.app_staff
       set failed_attempts = s.failed_attempts + 1,
           locked_until = case
             when s.failed_attempts + 1 >= 10 then now() + interval '60 minutes'
             when s.failed_attempts + 1 >= 5  then now() + interval '5 minutes'
             else locked_until end
     where id = s.id;
    return jsonb_build_object('ok', false, 'error', 'bad_pin');
  end if;
end; $$;

-- ── staff_create (forked from pos_create_staff, + server role + permissions) ──
create or replace function public.staff_create(p_business uuid, p_branch uuid, p_label text, p_pin text, p_role text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_label text; v_role text; v_created timestamptz;
begin
  v_label := nullif(btrim(coalesce(p_label, '')), '');
  v_role := lower(coalesce(p_role, 'cashier'));
  if v_label is null then return jsonb_build_object('ok', false, 'error', 'label'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then return jsonb_build_object('ok', false, 'error', 'weak'); end if;
  if v_role not in ('cashier','server','manager','owner') then v_role := 'cashier'; end if;
  if exists (select 1 from public.app_staff where business_id = p_business and lower(label) = lower(v_label) and active = true) then
    return jsonb_build_object('ok', false, 'error', 'duplicate_label');
  end if;
  insert into public.app_staff (business_id, branch_id, label, pin_hash, role)
    values (p_business, p_branch, v_label, crypt(p_pin, gen_salt('bf')), v_role)
    returning id, created_at into v_id, v_created;
  return jsonb_build_object('ok', true, 'id', v_id, 'label', v_label, 'role', v_role, 'branchId', p_branch, 'active', true, 'created_at', v_created);
end; $$;

-- ── log_staff_action: append-only audit insert, called INSIDE sensitive RPCs ──
create or replace function public.log_staff_action(
  p_business uuid, p_branch uuid, p_actor uuid, p_actor_label text,
  p_action text, p_target_table text, p_target_id text, p_amount numeric, p_detail text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.staff_audit (business_id, branch_id, actor_staff, actor_label, action, target_table, target_id, amount, detail)
  values (p_business, p_branch, p_actor, p_actor_label, p_action, p_target_table, p_target_id, p_amount, p_detail);
end; $$;

-- ── reset lockout (owner action from the Personnel UI) ───────────────────────
create or replace function public.staff_reset_lockout(p_business uuid, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.app_staff set failed_attempts = 0, locked_until = null where id = p_staff and business_id = p_business;
  return jsonb_build_object('ok', true);
end; $$;

-- ── BACKFILL (idempotent): pos_staff first (carries role/branch), then
-- staff_pins (role 'cashier'). bcrypt hashes copied as-is. Skips labels already
-- present so re-running is safe. ─────────────────────────────────────────────
insert into public.app_staff (business_id, branch_id, label, pin_hash, role, active, last_login_at)
select ps.business_id, ps.branch_id, ps.label, ps.pin_hash,
       case when ps.role in ('cashier','manager','owner') then ps.role else 'cashier' end, ps.active, ps.last_login_at
from public.pos_staff ps
where ps.active = true
  and not exists (select 1 from public.app_staff a where a.business_id = ps.business_id and lower(a.label) = lower(ps.label) and a.active);

insert into public.app_staff (business_id, branch_id, label, pin_hash, role, active)
select sp.business_id, null, sp.label, sp.pin_hash, 'cashier', sp.active
from public.staff_pins sp
where sp.active = true
  and not exists (select 1 from public.app_staff a where a.business_id = sp.business_id and lower(a.label) = lower(sp.label) and a.active);

-- ── grants: service-role only ─────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.staff_verify_pin(uuid,uuid,text)',
    'public.staff_create(uuid,uuid,text,text,text)',
    'public.log_staff_action(uuid,uuid,uuid,text,text,text,text,numeric,text)',
    'public.staff_reset_lockout(uuid,uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

notify pgrst, 'reload schema';
