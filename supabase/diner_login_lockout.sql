-- ============================================================================
-- Security fix: brute-force lockout + constant-time diner_login.
--
-- Before: diner_login did a single bcrypt check with NO attempt limit — all
-- 10 000 four-digit PINs were crackable in minutes against a known phone. It
-- also short-circuited when the account didn't exist, leaking (by timing) which
-- phones have accounts.
--
-- After: per-account failed-attempt counter with escalating lockout, and a
-- bcrypt is ALWAYS computed (real hash or a dummy) so a missing account is not
-- distinguishable by timing. Run ONCE in the Supabase SQL editor (idempotent).
-- ============================================================================

begin;

alter table public.diner_accounts add column if not exists failed_attempts int not null default 0;
alter table public.diner_accounts add column if not exists locked_until timestamptz;

create or replace function public.diner_login(p_slug text, p_phone text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_business public.businesses;
  v_account public.diner_accounts;
  v_token text;
  v_fa int;
  -- A fixed, valid bcrypt hash used only for timing parity when no account exists.
  v_dummy constant text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
begin
  select * into v_business from public.businesses where slug = p_slug and status = 'active' limit 1;
  if v_business.id is null then return jsonb_build_object('ok', false, 'error', 'no_business'); end if;

  select * into v_account from public.diner_accounts
    where business_id = v_business.id and phone = p_phone limit 1;

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
  v_token := public._new_session(v_account.id, v_business.id, v_account.phone);
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', v_account.phone, 'name', v_account.name);
end; $$;

-- Keep the lock-down: only the service role (server API routes) may call it.
revoke all on function public.diner_login(text, text, text) from public, anon, authenticated;
grant execute on function public.diner_login(text, text, text) to service_role;

commit;
