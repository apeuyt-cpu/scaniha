-- ════════════════════════════════════════════════════════════════════
-- Scaniha — Diner accounts (phone + 4-digit PIN) for the roulette / loyalty
-- Run this ONCE in the Supabase SQL editor (re-runnable / idempotent).
--
-- A diner account is PER BUSINESS (the loyalty program is per café), keyed by
-- phone. The secret is a 4-digit PIN, hashed with bcrypt (pgcrypto) into the
-- password_hash column (kept named for compatibility). All access goes through
-- SECURITY DEFINER functions called by the server with the service role — the
-- API routes are the auth boundary, so these tables are locked to the public.
--
-- NOTE: to switch to the GLOBAL one-account-per-phone model, run
-- supabase/accounts_global.sql instead AND deploy the `global-diner-identity`
-- branch. This file is the CURRENT (per-café) schema that `main` expects.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.diner_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  phone text not null,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (business_id, phone)
);

create table if not exists public.diner_sessions (
  token text primary key,
  account_id uuid not null references public.diner_accounts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_diner_accounts_biz on public.diner_accounts(business_id, phone);
create index if not exists idx_diner_sessions_acct on public.diner_sessions(account_id);
create index if not exists idx_diner_sessions_exp on public.diner_sessions(expires_at);

alter table public.diner_accounts enable row level security;
alter table public.diner_sessions enable row level security;
-- No public policies: only the SECURITY DEFINER functions (service_role) touch these.

-- ── helpers ───────────────────────────────────────────────────────────
create or replace function public._new_session(p_account uuid, p_business uuid, p_phone text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_token text;
begin
  v_token := encode(gen_random_bytes(24), 'hex');
  -- Effectively never expires (owner asked for permanent diner sessions).
  insert into public.diner_sessions (token, account_id, business_id, phone, expires_at)
    values (v_token, p_account, p_business, p_phone, now() + interval '100 years');
  return v_token;
end; $$;

-- ── diner_signup ──────────────────────────────────────────────────────
create or replace function public.diner_signup(p_slug text, p_phone text, p_password text, p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_business public.businesses;
  v_account_id uuid;
  v_token text;
  v_welcome int := 0;
begin
  if p_phone is null or length(p_phone) < 8 then return jsonb_build_object('ok', false, 'error', 'phone'); end if;
  -- The secret is a 4-digit PIN (low-friction). Reject anything that isn't.
  if p_password is null or p_password !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'weak'); end if;

  select * into v_business from public.businesses where slug = p_slug and status = 'active' limit 1;
  if v_business.id is null then return jsonb_build_object('ok', false, 'error', 'no_business'); end if;

  if exists (select 1 from public.diner_accounts where business_id = v_business.id and phone = p_phone) then
    return jsonb_build_object('ok', false, 'error', 'exists');
  end if;

  insert into public.diner_accounts (business_id, phone, name, password_hash, last_login_at)
    values (v_business.id, p_phone, nullif(btrim(coalesce(p_name, '')), ''), crypt(p_password, gen_salt('bf')), now())
    returning id into v_account_id;

  -- Welcome bonus, credited immediately at signup so the diner sees points right
  -- away (the join hook). Guarded so signup still succeeds if the loyalty tables
  -- aren't installed; first-spin/first-caisse won't double-grant (they check the
  -- ledger for an existing entry too).
  begin
    select coalesce(lp.welcome_points, 0) into v_welcome
      from public.loyalty_programs lp
      where lp.business_id = v_business.id and lp.active = true;
    if coalesce(v_welcome, 0) > 0
       and not exists (select 1 from public.points_ledger
                       where business_id = v_business.id and customer_phone = p_phone) then
      insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
        values (v_business.id, p_phone, v_welcome, 'welcome', 'Bienvenue');
    else
      v_welcome := 0;
    end if;
  exception when others then
    v_welcome := 0;
  end;

  v_token := public._new_session(v_account_id, v_business.id, p_phone);
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', p_phone,
    'name', nullif(btrim(coalesce(p_name, '')), ''), 'welcome', v_welcome);
end; $$;

-- ── diner_login ───────────────────────────────────────────────────────
create or replace function public.diner_login(p_slug text, p_phone text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_business public.businesses;
  v_account public.diner_accounts;
  v_token text;
begin
  select * into v_business from public.businesses where slug = p_slug and status = 'active' limit 1;
  if v_business.id is null then return jsonb_build_object('ok', false, 'error', 'no_business'); end if;

  select * into v_account from public.diner_accounts
    where business_id = v_business.id and phone = p_phone limit 1;
  if v_account.id is null or v_account.password_hash <> crypt(p_password, v_account.password_hash) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  update public.diner_accounts set last_login_at = now() where id = v_account.id;
  v_token := public._new_session(v_account.id, v_business.id, v_account.phone);
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', v_account.phone, 'name', v_account.name);
end; $$;

-- ── diner_session: validate a token, return the account (or ok=false) ──
create or replace function public.diner_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_sess public.diner_sessions;
  v_account public.diner_accounts;
begin
  if p_token is null or length(p_token) < 16 then return jsonb_build_object('ok', false); end if;
  select * into v_sess from public.diner_sessions where token = p_token limit 1;
  if v_sess.token is null or v_sess.expires_at < now() then return jsonb_build_object('ok', false); end if;
  select * into v_account from public.diner_accounts where id = v_sess.account_id limit 1;
  if v_account.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'phone', v_account.phone, 'name', v_account.name, 'businessId', v_sess.business_id);
end; $$;

-- ── diner_logout ──────────────────────────────────────────────────────
create or replace function public.diner_logout(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.diner_sessions where token = p_token;
  return jsonb_build_object('ok', true);
end; $$;

-- ── grants: API routes call as service_role; lock everything else ─────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.diner_signup(text,text,text,text)',
    'public.diner_login(text,text,text)',
    'public.diner_session(text)',
    'public.diner_logout(text)',
    'public._new_session(uuid,uuid,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
