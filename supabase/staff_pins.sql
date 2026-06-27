-- ════════════════════════════════════════════════════════════════════
-- Scaniha — Staff PINs for the caisse (opt-in per-staff authorization)
-- Run this ONCE in the Supabase SQL editor (re-runnable / idempotent).
--
-- A staff PIN lets an owner require a short code before a cashier can credit
-- a purchase at the caisse. PINs are PER BUSINESS, hashed with bcrypt
-- (pgcrypto) into pin_hash. All access goes through SECURITY DEFINER functions
-- called by the server with the service role — the API routes are the auth
-- boundary, so this table is locked to the public.
--
-- IMPORTANT: staff PINs are ENTIRELY SEPARATE from diner_accounts PINs. They
-- live in a different table (staff_pins, not diner_accounts), use a different
-- verify flow (verify_staff_pin, scoped by business_id), and have their own
-- hashes. A diner-account PIN hash can NEVER authenticate a staff PIN, and a
-- staff PIN can never log a diner in.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.staff_pins (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_pins_biz on public.staff_pins(business_id) where active;

alter table public.staff_pins enable row level security;
-- No public policies: only SECURITY DEFINER functions (service_role) touch this.

-- ── verify_staff_pin ──────────────────────────────────────────────────
-- CONSTANT-WORK (review fix #3.1): do NOT early-return on bad format or zero
-- rows. Always run at least one bcrypt comparison so timing does not leak
-- "no pins exist" vs "pin mismatch" vs "bad format".
create or replace function public.verify_staff_pin(p_business uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  v_ok boolean := false;
  v_fmt boolean := (p_pin is not null and p_pin ~ '^[0-9]{4,6}$');
  -- A fixed dummy bcrypt hash so a business with zero pins still does one crypt().
  v_dummy constant text := '$2a$06$0000000000000000000000000000000000000000000000000000a';
  v_any boolean := false;
begin
  for r in select pin_hash from public.staff_pins
           where business_id = p_business and active = true loop
    v_any := true;
    -- crypt() tolerates any candidate text; no break — constant work over all rows.
    if v_fmt and r.pin_hash = crypt(coalesce(p_pin, ''), r.pin_hash) then v_ok := true; end if;
  end loop;
  if not v_any then
    -- Burn one comparison against the dummy hash to equalize timing for the
    -- empty-set case; result is discarded.
    perform crypt(coalesce(p_pin, ''), v_dummy);
  end if;
  return v_ok and v_fmt;
end; $$;

-- ── business_has_staff_pins ───────────────────────────────────────────
create or replace function public.business_has_staff_pins(p_business uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.staff_pins where business_id = p_business and active = true);
$$;

-- ── create_staff_pin ──────────────────────────────────────────────────
-- Hashes in Postgres so the raw PIN never persists in the app layer. Rejects
-- weak pins + empty labels + duplicate active labels per business (review fix
-- #3.2). Returns the PUBLIC row on ok, else {ok:false,error:...}.
create or replace function public.create_staff_pin(p_business uuid, p_label text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_label text; v_created timestamptz;
begin
  v_label := nullif(btrim(coalesce(p_label, '')), '');
  if v_label is null then return jsonb_build_object('ok', false, 'error', 'label'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then return jsonb_build_object('ok', false, 'error', 'weak'); end if;
  if exists(select 1 from public.staff_pins where business_id = p_business and label = v_label and active = true) then
    return jsonb_build_object('ok', false, 'error', 'duplicate_label');
  end if;
  insert into public.staff_pins (business_id, label, pin_hash)
    values (p_business, v_label, crypt(p_pin, gen_salt('bf')))
    returning id, created_at into v_id, v_created;
  return jsonb_build_object('ok', true, 'id', v_id, 'label', v_label, 'active', true, 'created_at', v_created);
end; $$;

-- ── grants: API routes call as service_role; lock everything else ─────
-- (review fix #3.6: exact signatures)
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.verify_staff_pin(uuid,text)',
    'public.business_has_staff_pins(uuid)',
    'public.create_staff_pin(uuid,text,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
