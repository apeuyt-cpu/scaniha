-- Remove the wheel-spin point bonus (play_points).
-- Loyalty points now come ONLY from spending at the caisse (1 TND = 1 point)
-- plus the optional first-visit welcome bonus. Spinning the wheel grants a prize
-- code, never points.
--
-- Run once in Supabase → SQL Editor. Order matters: replace the function first
-- (so it no longer reads play_points), then drop the column.

begin;

-- 1) Updated play_game: identical to before, minus every play_points reference.
create or replace function public.play_game(p_slug text, p_device text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business public.businesses;
  v_game public.games;
  v_program public.loyalty_programs;
  v_since timestamptz;
  v_cooldown int;
  v_next_play timestamptz;
  v_count int;
  v_prize_id uuid;
  v_prize_label text;
  v_prize_stock int;
  v_index int;
  v_play_id uuid;
  v_code text;
  v_expires timestamptz;
  v_win_id uuid;
  v_attempt int;
  v_welcome int := 0;
  v_has_ledger boolean;
  v_balance int;
begin
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active' limit 1;
  if v_business.id is null then return jsonb_build_object('ok', false, 'error', 'no_business'); end if;

  select * into v_game from public.games
    where business_id = v_business.id and type = 'roulette' and active = true
    limit 1 for update;
  if v_game.id is null then return jsonb_build_object('ok', false, 'error', 'no_game'); end if;

  v_cooldown := greatest(1, coalesce((v_game.config->>'cooldownHours')::int, 24));
  v_since := now() - make_interval(hours => v_cooldown);

  if p_phone is not null then
    select count(*) into v_count from public.plays
      where game_id = v_game.id and customer_phone = p_phone and created_at >= v_since;
    if v_count >= greatest(1, v_game.daily_limit) then
      select created_at into v_next_play from public.plays
        where game_id = v_game.id and customer_phone = p_phone and created_at >= v_since
        order by created_at desc offset (greatest(1, v_game.daily_limit) - 1) limit 1;
      return jsonb_build_object('ok', false, 'error', 'phone_limit',
        'nextPlayAt', v_next_play + make_interval(hours => v_cooldown));
    end if;
  end if;
  if p_device is not null then
    select count(*) into v_count from public.plays
      where game_id = v_game.id and device_id = p_device and created_at >= v_since;
    if v_count >= greatest(1, v_game.daily_limit) then
      select created_at into v_next_play from public.plays
        where game_id = v_game.id and device_id = p_device and created_at >= v_since
        order by created_at desc offset (greatest(1, v_game.daily_limit) - 1) limit 1;
      return jsonb_build_object('ok', false, 'error', 'device_limit',
        'nextPlayAt', v_next_play + make_interval(hours => v_cooldown));
    end if;
  end if;

  select id, label, stock into v_prize_id, v_prize_label, v_prize_stock
    from public.prizes
    where game_id = v_game.id and active = true and weight > 0
      and (stock is null or stock > 0)
    order by (-ln(random()) / weight)
    limit 1;
  if v_prize_id is null then return jsonb_build_object('ok', false, 'error', 'no_prizes'); end if;

  select idx - 1 into v_index from (
    select id, row_number() over (order by position, created_at) as idx
    from public.prizes where game_id = v_game.id and active = true
  ) t where t.id = v_prize_id;

  if v_prize_stock is not null then
    update public.prizes set stock = greatest(0, stock - 1) where id = v_prize_id;
  end if;

  insert into public.plays (game_id, business_id, customer_phone, device_id, prize_id)
    values (v_game.id, v_business.id, p_phone, p_device, v_prize_id)
    returning id into v_play_id;

  v_expires := now() + make_interval(hours => greatest(1, v_game.win_expiry_hours));

  v_win_id := null;
  for v_attempt in 1..6 loop
    v_code := public._gen_play_code();
    begin
      insert into public.wins (play_id, business_id, prize_id, prize_label, code, customer_phone, status, expires_at)
        values (v_play_id, v_business.id, v_prize_id, v_prize_label, v_code, p_phone, 'pending', v_expires)
        returning id into v_win_id;
      exit;
    exception when unique_violation then v_win_id := null;
    end;
  end loop;
  if v_win_id is null then return jsonb_build_object('ok', false, 'error', 'code_failed'); end if;

  -- loyalty: welcome bonus on first visit only — spinning the wheel never grants
  -- points (points come from spending at the caisse, 1 TND = 1 point).
  if p_phone is not null then
    select * into v_program from public.loyalty_programs
      where business_id = v_business.id and active = true limit 1;
    if v_program.business_id is not null then
      select exists(select 1 from public.points_ledger
        where business_id = v_business.id and customer_phone = p_phone) into v_has_ledger;
      if not v_has_ledger and coalesce(v_program.welcome_points, 0) > 0 then
        insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
          values (v_business.id, p_phone, v_program.welcome_points, 'welcome', 'Bienvenue');
        v_welcome := v_program.welcome_points;
      end if;
    end if;
  end if;

  v_next_play := null;
  if p_phone is not null then
    select count(*) into v_count from public.plays
      where game_id = v_game.id and customer_phone = p_phone and created_at >= v_since;
    if v_count >= greatest(1, v_game.daily_limit) then
      select created_at into v_next_play from public.plays
        where game_id = v_game.id and customer_phone = p_phone and created_at >= v_since
        order by created_at desc offset (greatest(1, v_game.daily_limit) - 1) limit 1;
    end if;
  end if;

  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = v_business.id and customer_phone = p_phone;

  return jsonb_build_object(
    'ok', true,
    'prizeIndex', v_index,
    'prizeLabel', v_prize_label,
    'code', v_code,
    'expiresAt', v_expires,
    'pointsEarned', v_welcome,
    'balance', v_balance,
    'nextPlayAt', case when v_next_play is null then null
                       else v_next_play + make_interval(hours => v_cooldown) end
  );
end; $$;

-- 2) Drop the retired column (safe now: nothing references it anymore).
alter table public.loyalty_programs drop column if exists play_points;

commit;
