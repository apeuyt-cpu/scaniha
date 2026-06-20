-- ════════════════════════════════════════════════════════════════════
-- Scaniha — GLOBAL diner identity (one phone = one account = one PIN)
-- Run ONCE in the Supabase SQL editor / Management API (re-runnable / idempotent).
--
-- This is the CURRENT, canonical account schema. Identity is GLOBAL: a customer
-- signs up once (phone + 4-digit PIN) and is recognized at EVERY café. Loyalty
-- DATA (plays / wins / points / redemptions) stays strictly PER CAFÉ in its own
-- tables (keyed by business_id + customer_phone) — only the LOGIN is shared, so a
-- single login fans out into N independent per-café balances. Each café keeps its
-- own wheel, odds, prizes, rewards and branding.
--
-- Supersedes the old per-café accounts.sql + the early password-only draft of this
-- file. It is PIN-aware (4 digits), keeps the brute-force lockout, and lets signup
-- carry an OPTIONAL café slug so the per-café welcome bonus still works when a
-- diner signs up from a specific café's hub. Wallet (café-less) signup passes null.
--
-- DESTRUCTIVE only if duplicate per-café accounts exist for a phone (collapses to
-- one). Audited 2026-06-18: 0 duplicates in prod, so this runs loss-free.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.diner_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null, -- origin café only; nullable
  phone text not null,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

alter table public.diner_accounts add column if not exists failed_attempts int not null default 0;
alter table public.diner_accounts add column if not exists locked_until timestamptz;

-- ── collapse any per-café duplicates → one global identity per phone ───────────
do $$
begin
  -- keep the most recently active row per phone …
  delete from public.diner_accounts a
  using public.diner_accounts b
  where a.phone = b.phone
    and a.id <> b.id
    and coalesce(a.last_login_at, a.created_at) < coalesce(b.last_login_at, b.created_at);
  -- … then break any remaining ties deterministically.
  delete from public.diner_accounts a
  using public.diner_accounts b
  where a.phone = b.phone and a.id < b.id;
end $$;

alter table public.diner_accounts drop constraint if exists diner_accounts_business_id_phone_key;
alter table public.diner_accounts alter column business_id drop not null;
create unique index if not exists diner_accounts_phone_key on public.diner_accounts(phone);

create table if not exists public.diner_sessions (
  token text primary key,
  account_id uuid not null references public.diner_accounts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.diner_sessions alter column business_id drop not null;

create index if not exists idx_diner_accounts_phone on public.diner_accounts(phone);
create index if not exists idx_diner_sessions_acct on public.diner_sessions(account_id);
create index if not exists idx_diner_sessions_exp on public.diner_sessions(expires_at);

alter table public.diner_accounts enable row level security;
alter table public.diner_sessions enable row level security;
-- No public policies: only the SECURITY DEFINER functions (service_role) touch these.

-- ── drop the old signatures so only the global ones remain ────────────────────
drop function if exists public.diner_signup(text, text, text, text);  -- old per-café (p_slug,p_phone,p_password,p_name)
drop function if exists public.diner_signup(text, text, text);        -- early global draft (no slug)
drop function if exists public.diner_login(text, text, text);         -- old per-café (p_slug,p_phone,p_password)

-- ── session helper (global: no business binding) ──────────────────────────────
create or replace function public._new_session(p_account uuid, p_phone text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_token text;
begin
  v_token := encode(gen_random_bytes(24), 'hex');
  -- Effectively never expires (owner asked for permanent diner sessions).
  insert into public.diner_sessions (token, account_id, phone, expires_at)
    values (v_token, p_account, p_phone, now() + interval '100 years');
  return v_token;
end; $$;
drop function if exists public._new_session(uuid, uuid, text);

-- ── diner_signup: GLOBAL identity, 4-digit PIN, optional café for welcome bonus ─
create or replace function public.diner_signup(p_phone text, p_password text, p_name text, p_slug text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_account_id uuid;
  v_token text;
  v_name text;
  v_business public.businesses;
  v_welcome int := 0;
begin
  if p_phone is null or length(p_phone) < 8 then return jsonb_build_object('ok', false, 'error', 'phone'); end if;
  -- The secret is a 4-digit PIN (low-friction). Reject anything that isn't.
  if p_password is null or p_password !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'weak'); end if;

  -- GLOBAL uniqueness: one account per phone across all cafés.
  if exists (select 1 from public.diner_accounts where phone = p_phone) then
    return jsonb_build_object('ok', false, 'error', 'exists');
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  insert into public.diner_accounts (phone, name, password_hash, business_id, last_login_at)
    values (p_phone, v_name, crypt(p_password, gen_salt('bf')),
            (select id from public.businesses where slug = p_slug and status = 'active' limit 1), now())
    returning id into v_account_id;

  -- Optional per-café welcome bonus: only when signing up FROM a café's hub (p_slug
  -- given). The wallet (café-less) signup passes null → no bonus. Guarded so signup
  -- still succeeds if the loyalty tables aren't installed, and never double-grants.
  if p_slug is not null then
    begin
      select * into v_business from public.businesses where slug = p_slug and status = 'active' limit 1;
      if v_business.id is not null then
        select coalesce(lp.welcome_points, 0) into v_welcome
          from public.loyalty_programs lp where lp.business_id = v_business.id and lp.active = true;
        if coalesce(v_welcome, 0) > 0
           and not exists (select 1 from public.points_ledger
                           where business_id = v_business.id and customer_phone = p_phone) then
          insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
            values (v_business.id, p_phone, v_welcome, 'welcome', 'Bienvenue');
        else
          v_welcome := 0;
        end if;
      end if;
    exception when others then
      v_welcome := 0;
    end;
  end if;

  v_token := public._new_session(v_account_id, p_phone);
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', p_phone, 'name', v_name, 'welcome', v_welcome);
end; $$;

-- ── diner_login: GLOBAL, constant-time, brute-force lockout (5→5min, 10→60min) ─
create or replace function public.diner_login(p_phone text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_account public.diner_accounts;
  v_token text;
  v_fa int;
  -- A fixed, valid bcrypt hash used only for timing parity when no account exists.
  v_dummy constant text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
begin
  select * into v_account from public.diner_accounts where phone = p_phone limit 1;

  -- Active lockout → reject without even checking the PIN.
  if v_account.id is not null and v_account.locked_until is not null and v_account.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;

  -- No account: still spend ~one bcrypt so timing can't enumerate phones, then
  -- return the SAME generic error as a wrong PIN.
  if v_account.id is null then
    perform crypt(p_password, v_dummy);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Wrong PIN → increment (resetting the window if a prior lock already expired)
  -- and re-lock with escalating duration.
  if v_account.password_hash <> crypt(p_password, v_account.password_hash) then
    v_fa := (case when v_account.locked_until is not null and v_account.locked_until <= now()
                  then 0 else v_account.failed_attempts end) + 1;
    update public.diner_accounts
      set failed_attempts = v_fa,
          locked_until = case
            when v_fa >= 10 then now() + interval '60 minutes'
            when v_fa >= 5  then now() + interval '5 minutes'
            else null end
      where id = v_account.id;
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Success → clear the counter, issue a session.
  update public.diner_accounts
    set failed_attempts = 0, locked_until = null, last_login_at = now()
    where id = v_account.id;
  v_token := public._new_session(v_account.id, v_account.phone);
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', v_account.phone, 'name', v_account.name);
end; $$;

-- ── diner_session: validate a token → the account (global, no businessId) ──────
create or replace function public.diner_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_sess public.diner_sessions; v_account public.diner_accounts;
begin
  if p_token is null or length(p_token) < 16 then return jsonb_build_object('ok', false); end if;
  select * into v_sess from public.diner_sessions where token = p_token limit 1;
  if v_sess.token is null or v_sess.expires_at < now() then return jsonb_build_object('ok', false); end if;
  select * into v_account from public.diner_accounts where id = v_sess.account_id limit 1;
  if v_account.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'phone', v_account.phone, 'name', v_account.name);
end; $$;

create or replace function public.diner_logout(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.diner_sessions where token = p_token;
  return jsonb_build_object('ok', true);
end; $$;

-- ── grants: API routes call as service_role; lock everything else ─────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.diner_signup(text,text,text,text)',
    'public.diner_login(text,text)',
    'public.diner_session(text)',
    'public.diner_logout(text)',
    'public._new_session(uuid,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
