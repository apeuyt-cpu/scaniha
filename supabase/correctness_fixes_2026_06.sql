-- Correctness fixes (2026-06-20) — diner_wallet active_wins, validate_code refund+race lock, diner_signup welcome-bonus lock.
-- Idempotent (create or replace). Apply via scripts/apply-sql-api.mjs.

-- ===== wallet-active-wins =====
create or replace function public.diner_wallet(p_phone text)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.balance desc, x.name), '[]'::jsonb)
  from (
    select
      b.slug,
      b.name,
      b.logo_url,
      coalesce(nullif(b.primary_color, ''), '#F47B20')                          as accent,
      exists(select 1 from public.games g
             where g.business_id = b.id and g.active)                           as has_roulette,
      exists(select 1 from public.loyalty_programs lp
             where lp.business_id = b.id and lp.active)                         as has_loyalty,
      case when exists(select 1 from public.loyalty_programs lp
                       where lp.business_id = b.id and lp.active)
           then coalesce((select sum(pl.delta)::int from public.points_ledger pl
                          where pl.business_id = b.id and pl.customer_phone = p_phone), 0)
           else 0 end                                                            as balance,
      (select count(*)::int from public.wins w
        where w.business_id = b.id and w.customer_phone = p_phone
          and w.status = 'pending' and w.expires_at > now())                    as active_wins
    from public.businesses b
    where b.status = 'active'
      and case
            when (b.design_settings->>'products') = 'fidelity' then true
            when (b.design_settings->>'products') = 'menu' then false
            else coalesce((b.design_settings->>'loyaltyEnabled') <> 'false', true)
          end
      and (
        exists(select 1 from public.points_ledger pl where pl.business_id = b.id and pl.customer_phone = p_phone)
        or exists(select 1 from public.wins w  where w.business_id = b.id and w.customer_phone = p_phone)
        or exists(select 1 from public.plays p where p.business_id = b.id and p.customer_phone = p_phone)
      )
  ) x;
$$;

-- ===== validate-code =====
create or replace function public.validate_code(p_business uuid, p_code text, p_redeem boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_win public.wins;
  v_red public.loyalty_redemptions;
begin
  if length(v_norm) < 4 then return jsonb_build_object('found', false); end if;

  select * into v_win from public.wins
    where business_id = p_business and upper(replace(code, '-', '')) = v_norm limit 1;
  if v_win.id is not null then
    if v_win.status = 'redeemed' then
      return jsonb_build_object('found', true, 'kind', 'win', 'status', 'already',
        'label', v_win.prize_label, 'customerPhone', v_win.customer_phone, 'redeemedAt', v_win.redeemed_at);
    elsif v_win.expires_at < now() then
      if p_redeem then update public.wins set status = 'expired' where id = v_win.id and status = 'pending'; end if;
      return jsonb_build_object('found', true, 'kind', 'win', 'status', 'expired',
        'label', v_win.prize_label, 'customerPhone', v_win.customer_phone);
    elsif not p_redeem then
      return jsonb_build_object('found', true, 'kind', 'win', 'status', 'valid',
        'label', v_win.prize_label, 'customerPhone', v_win.customer_phone, 'expiresAt', v_win.expires_at);
    else
      update public.wins set status = 'redeemed', redeemed_at = now()
        where id = v_win.id and status = 'pending';
      if not found then
        -- Lost the race (already collected / expired). Report the real status.
        select * into v_win from public.wins where id = v_win.id;
        if v_win.status = 'redeemed' then
          return jsonb_build_object('found', true, 'kind', 'win', 'status', 'already',
            'label', v_win.prize_label, 'customerPhone', v_win.customer_phone, 'redeemedAt', v_win.redeemed_at);
        else
          return jsonb_build_object('found', true, 'kind', 'win', 'status', 'expired',
            'label', v_win.prize_label, 'customerPhone', v_win.customer_phone);
        end if;
      end if;
      return jsonb_build_object('found', true, 'kind', 'win', 'status', 'redeemed',
        'label', v_win.prize_label, 'customerPhone', v_win.customer_phone);
    end if;
  end if;

  select * into v_red from public.loyalty_redemptions
    where business_id = p_business and upper(replace(code, '-', '')) = v_norm limit 1;
  if v_red.id is not null then
    if v_red.status = 'redeemed' then
      return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'already',
        'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'redeemedAt', v_red.redeemed_at);
    elsif v_red.status = 'cancelled' then
      return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'cancelled',
        'label', v_red.reward_label, 'customerPhone', v_red.customer_phone);
    elsif v_red.expires_at < now() then
      if p_redeem then
        -- Serialize per (business, phone) so the refund can't race a concurrent op.
        perform pg_advisory_xact_lock(hashtext(p_business::text || '|' || coalesce(v_red.customer_phone, '')));
        update public.loyalty_redemptions set status = 'expired' where id = v_red.id and status = 'pending';
        if found then
          -- Refund the points debited at redeem time (parity with decline_redemption).
          insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
            values (p_business, v_red.customer_phone, v_red.points_cost, 'adjust', 'Récompense expirée — remboursement');
        end if;
      end if;
      return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'expired',
        'label', v_red.reward_label, 'customerPhone', v_red.customer_phone);
    elsif not p_redeem then
      return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'valid',
        'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'pointsCost', v_red.points_cost, 'expiresAt', v_red.expires_at);
    else
      -- Serialize per (business, phone) so collect can't double-fire or race an approve-vs-decline.
      perform pg_advisory_xact_lock(hashtext(p_business::text || '|' || coalesce(v_red.customer_phone, '')));
      update public.loyalty_redemptions set status = 'redeemed', redeemed_at = now()
        where id = v_red.id and status = 'pending';
      if not found then
        -- Lost the race (already collected / cancelled+refunded / expired). Re-read the
        -- real status and report it instead of falsely claiming a fresh redemption.
        select * into v_red from public.loyalty_redemptions where id = v_red.id;
        if v_red.status = 'redeemed' then
          return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'already',
            'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'redeemedAt', v_red.redeemed_at, 'pointsCost', v_red.points_cost);
        elsif v_red.status = 'cancelled' then
          return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'cancelled',
            'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'pointsCost', v_red.points_cost);
        else
          return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'expired',
            'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'pointsCost', v_red.points_cost);
        end if;
      end if;
      return jsonb_build_object('found', true, 'kind', 'reward', 'status', 'redeemed',
        'label', v_red.reward_label, 'customerPhone', v_red.customer_phone, 'pointsCost', v_red.points_cost);
    end if;
  end if;

  return jsonb_build_object('found', false);
end; $$;

-- ===== welcome-lock =====
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
        -- Serialize per (business, phone) — same lock award_points/play_game take — so a
        -- signup racing a first caisse award can't double-grant the welcome bonus.
        perform pg_advisory_xact_lock(hashtext(v_business.id::text || '|' || p_phone));
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

