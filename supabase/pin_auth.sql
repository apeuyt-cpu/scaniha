-- ════════════════════════════════════════════════════════════════════
-- Scaniha — switch diner auth to a 4-digit PIN + credit the welcome bonus
-- at signup. Run this ONCE in the Supabase SQL editor (idempotent).
--
-- This only replaces the diner_signup function body: the secret is now a
-- 4-digit PIN (was a 6-char password) and the loyalty welcome bonus is
-- credited the moment the diner signs up, so they see points immediately.
-- The signature is unchanged (text,text,text,text), so existing grants stay.
--
-- NOTE: existing accounts created with a 6+ char password can no longer log in
-- with a 4-digit PIN — early-stage, so just have them sign up again. Login
-- itself needs no change (it bcrypt-compares whatever was stored).
-- ════════════════════════════════════════════════════════════════════

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

  -- Welcome bonus, credited immediately at signup (the join hook). Guarded so
  -- signup still works if the loyalty tables aren't installed; first-spin /
  -- first-caisse won't double-grant (they also check the ledger first).
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

-- Re-assert grants (no-op if already set; service_role only).
revoke all on function public.diner_signup(text,text,text,text) from public, anon, authenticated;
grant execute on function public.diner_signup(text,text,text,text) to service_role;
