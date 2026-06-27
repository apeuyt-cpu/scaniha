-- ════════════════════════════════════════════════════════════════════
-- Scaniha — Gamification v1 (roulette "everyone wins, variable value")
-- Run this once in the Supabase SQL editor.
-- Entities follow the PlayCafé dossier data model so future modules
-- (staff PINs, leaderboards, hub) plug in without a rebuild.
-- ════════════════════════════════════════════════════════════════════

-- One game per business in v1 (type = 'roulette'); more types later.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null default 'roulette',
  active boolean not null default false,
  -- per-device/phone plays allowed per day
  daily_limit int not null default 1,
  -- hours before an unredeemed win expires
  win_expiry_hours int not null default 24,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, type)
);

create table if not exists public.prizes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  label text not null,
  -- relative draw weight (higher = more frequent). Everyone wins SOMETHING.
  weight int not null default 1 check (weight >= 0),
  -- remaining stock; null = unlimited
  stock int,
  -- internal cost estimate (TND) for the owner's budget view
  cost numeric,
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_phone text,
  device_id text,
  prize_id uuid references public.prizes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.wins (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.plays(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  prize_id uuid references public.prizes(id) on delete set null,
  prize_label text not null,
  code text not null unique,
  status text not null default 'pending' check (status in ('pending','redeemed','expired')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_games_business on public.games(business_id);
create index if not exists idx_prizes_game on public.prizes(game_id);
create index if not exists idx_plays_game_day on public.plays(game_id, created_at);
create index if not exists idx_plays_device on public.plays(game_id, device_id, created_at);
create index if not exists idx_plays_phone on public.plays(game_id, customer_phone, created_at);
create index if not exists idx_wins_business_status on public.wins(business_id, status, created_at);
create index if not exists idx_wins_code on public.wins(code);

-- ── Row level security ────────────────────────────────────────────────
alter table public.games enable row level security;
alter table public.prizes enable row level security;
alter table public.plays enable row level security;
alter table public.wins enable row level security;

-- Owners manage their own game/prizes; read their plays/wins; redeem wins.
drop policy if exists games_owner_all on public.games;
create policy games_owner_all on public.games
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

drop policy if exists prizes_owner_all on public.prizes;
create policy prizes_owner_all on public.prizes
  for all using (
    game_id in (
      select g.id from public.games g
      join public.businesses b on b.id = g.business_id
      where b.owner_id = auth.uid()
    )
  ) with check (
    game_id in (
      select g.id from public.games g
      join public.businesses b on b.id = g.business_id
      where b.owner_id = auth.uid()
    )
  );

drop policy if exists plays_owner_read on public.plays;
create policy plays_owner_read on public.plays
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

drop policy if exists wins_owner_read on public.wins;
create policy wins_owner_read on public.wins
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

drop policy if exists wins_owner_redeem on public.wins;
create policy wins_owner_redeem on public.wins
  for update using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Public (anon) may see ACTIVE games + their active prizes (to render the wheel).
-- The draw itself is server-side only — clients can never pick a prize.
drop policy if exists games_public_read_active on public.games;
create policy games_public_read_active on public.games
  for select using (active = true);

drop policy if exists prizes_public_read_active on public.prizes;
create policy prizes_public_read_active on public.prizes
  for select using (
    active = true and game_id in (select id from public.games where active = true)
  );

-- ════════════════════════════════════════════════════════════════════
-- Physical add-ons on payment requests (QR stands, stickers…)
-- ════════════════════════════════════════════════════════════════════
alter table public.payment_requests
  add column if not exists addons jsonb not null default '[]'::jsonb;

-- ════════════════════════════════════════════════════════════════════
-- Loyalty / points — customers earn points on purchases, redeem rewards
-- ════════════════════════════════════════════════════════════════════

-- One program per business.
create table if not exists public.loyalty_programs (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  active boolean not null default false,
  -- points earned per 1 TND spent (owner-tunable)
  points_per_tnd numeric not null default 1,
  -- points offered on first visit (owner-tunable; 0 disables)
  welcome_points int not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  points_cost int not null check (points_cost > 0),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Every point movement (earn = positive, redeem = negative).
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_phone text not null,
  customer_name text,
  delta int not null,
  reason text not null, -- 'purchase' | 'play' | 'welcome' | 'redeem' | 'adjust'
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_phone text not null,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  reward_label text not null,
  points_cost int not null,
  code text not null unique,
  status text not null default 'pending' check (status in ('pending','redeemed','expired','cancelled')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_business_phone on public.points_ledger(business_id, customer_phone, created_at);
create index if not exists idx_rewards_business on public.loyalty_rewards(business_id);
create index if not exists idx_redemptions_business_status on public.loyalty_redemptions(business_id, status, created_at);
create index if not exists idx_redemptions_code on public.loyalty_redemptions(code);

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.points_ledger enable row level security;
alter table public.loyalty_redemptions enable row level security;

-- Owners manage their program/rewards; read + write their ledger/redemptions.
drop policy if exists loyalty_programs_owner_all on public.loyalty_programs;
create policy loyalty_programs_owner_all on public.loyalty_programs
  for all using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists loyalty_rewards_owner_all on public.loyalty_rewards;
create policy loyalty_rewards_owner_all on public.loyalty_rewards
  for all using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists points_ledger_owner_all on public.points_ledger;
create policy points_ledger_owner_all on public.points_ledger
  for all using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists loyalty_redemptions_owner_all on public.loyalty_redemptions;
create policy loyalty_redemptions_owner_all on public.loyalty_redemptions
  for all using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Public sees ACTIVE programs + their active rewards (balances go through the API).
drop policy if exists loyalty_programs_public_read on public.loyalty_programs;
create policy loyalty_programs_public_read on public.loyalty_programs
  for select using (active = true);

drop policy if exists loyalty_rewards_public_read on public.loyalty_rewards;
create policy loyalty_rewards_public_read on public.loyalty_rewards
  for select using (
    active = true and business_id in (select business_id from public.loyalty_programs where active = true)
  );

-- ════════════════════════════════════════════════════════════════════
-- v2 — schema additions + atomic functions (re-runnable; safe to re-paste)
-- Spin, redeem, award, validate and lookup now happen in ONE transaction
-- inside the database, so there are no client-side races (double-spin past
-- the daily limit, stock over-decrement, balance TOCTOU on redeem).
-- ════════════════════════════════════════════════════════════════════

-- Tie a win to the customer (denormalized from the play) so it shows on the
-- /fidelite "my codes" panel and in the caisse lookup.
alter table public.wins add column if not exists customer_phone text;
create index if not exists idx_wins_phone on public.wins(business_id, customer_phone, created_at);

-- Owner-tunable redemption expiry (was hardcoded to 48h in the API).
alter table public.loyalty_programs add column if not exists redeem_expiry_hours int not null default 48;

-- ── Human-friendly redeem code (e.g. "K7F-3QZ", no 0/O/1/I ambiguity) ──
create or replace function public._gen_play_code()
returns text language plpgsql volatile as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  raw text := '';
  i int;
begin
  for i in 1..6 loop
    raw := raw || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return substr(raw, 1, 3) || '-' || substr(raw, 4, 3);
end; $$;

-- ── play_game: the whole spin in one locked transaction ───────────────
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

  -- lock the game row → spins for this business are serialized
  select * into v_game from public.games
    where business_id = v_business.id and type = 'roulette' and active = true
    limit 1 for update;
  if v_game.id is null then return jsonb_build_object('ok', false, 'error', 'no_game'); end if;

  -- Rolling cooldown window: a phone/device may play daily_limit times within
  -- ANY window of cooldown_hours (config.cooldownHours, default 24). The window
  -- slides from each play — a true "once per 24h / week", not a midnight reset
  -- (which let a diner spin at 23:59 and again at 00:01). nextPlayAt = the play
  -- whose ageing-out drops the count below the limit, + the cooldown.
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

  -- weighted draw (Efraimidis–Spirakis key) over active, in-stock prizes
  select id, label, stock into v_prize_id, v_prize_label, v_prize_stock
    from public.prizes
    where game_id = v_game.id and active = true and weight > 0
      and (stock is null or stock > 0)
    order by (-ln(random()) / weight)
    limit 1;
  if v_prize_id is null then return jsonb_build_object('ok', false, 'error', 'no_prizes'); end if;

  -- 0-based index among active prizes, same order as the GET payload
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

  -- After this play, is the player now at their limit? If so, return when the
  -- next play unlocks (drives the on-screen countdown); null = plays still left.
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

-- ── redeem_reward: balance check + redemption + debit, atomically ─────
create or replace function public.redeem_reward(p_slug text, p_phone text, p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business public.businesses;
  v_program public.loyalty_programs;
  v_reward public.loyalty_rewards;
  v_balance int;
  v_code text;
  v_red_id uuid;
  v_expires timestamptz;
  v_attempt int;
begin
  select * into v_business from public.businesses where slug = p_slug and status = 'active' limit 1;
  if v_business.id is null then return jsonb_build_object('ok', false, 'error', 'no_business'); end if;

  select * into v_program from public.loyalty_programs
    where business_id = v_business.id and active = true limit 1;
  if v_program.business_id is null then return jsonb_build_object('ok', false, 'error', 'no_program'); end if;

  select * into v_reward from public.loyalty_rewards
    where id = p_reward_id and business_id = v_business.id and active = true limit 1;
  if v_reward.id is null then return jsonb_build_object('ok', false, 'error', 'no_reward'); end if;

  perform pg_advisory_xact_lock(hashtext(v_business.id::text || '|' || p_phone));

  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = v_business.id and customer_phone = p_phone;
  if v_balance < v_reward.points_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'missing', v_reward.points_cost - v_balance);
  end if;

  v_expires := now() + make_interval(hours => greatest(1, coalesce(v_program.redeem_expiry_hours, 48)));
  v_red_id := null;
  for v_attempt in 1..6 loop
    v_code := public._gen_play_code();
    begin
      insert into public.loyalty_redemptions
        (business_id, customer_phone, reward_id, reward_label, points_cost, code, status, expires_at)
        values (v_business.id, p_phone, v_reward.id, v_reward.label, v_reward.points_cost, v_code, 'pending', v_expires)
        returning id into v_red_id;
      exit;
    exception when unique_violation then v_red_id := null;
    end;
  end loop;
  if v_red_id is null then return jsonb_build_object('ok', false, 'error', 'code_failed'); end if;

  insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
    values (v_business.id, p_phone, -v_reward.points_cost, 'redeem', v_reward.label);

  return jsonb_build_object('ok', true, 'code', v_code, 'rewardLabel', v_reward.label,
    'expiresAt', v_expires, 'balance', v_balance - v_reward.points_cost);
end; $$;

-- ── award_points: caisse credit (+ welcome on first visit) ────────────
create or replace function public.award_points(p_business uuid, p_phone text, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_program public.loyalty_programs;
  v_points int;
  v_welcome int := 0;
  v_has_ledger boolean;
  v_balance int;
begin
  select * into v_program from public.loyalty_programs where business_id = p_business limit 1;
  if v_program.business_id is null then return jsonb_build_object('ok', false, 'error', 'no_program'); end if;

  v_points := round(p_amount * coalesce(v_program.points_per_tnd, 1))::int;
  if v_points <= 0 then return jsonb_build_object('ok', false, 'error', 'bad_amount'); end if;

  perform pg_advisory_xact_lock(hashtext(p_business::text || '|' || p_phone));

  select exists(select 1 from public.points_ledger
    where business_id = p_business and customer_phone = p_phone) into v_has_ledger;
  if not v_has_ledger and coalesce(v_program.welcome_points, 0) > 0 then
    insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
      values (p_business, p_phone, v_program.welcome_points, 'welcome', 'Bienvenue');
    v_welcome := v_program.welcome_points;
  end if;

  insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
    values (p_business, p_phone, v_points, 'purchase', coalesce(nullif(p_note, ''), 'Achat'));

  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = p_business and customer_phone = p_phone;

  return jsonb_build_object('ok', true, 'pointsAdded', v_points, 'welcomeAdded', v_welcome, 'balance', v_balance);
end; $$;

-- ── validate_code: one entry point for a win OR a reward code ─────────
-- Drop the old 2-arg signature so the new p_redeem overload isn't ambiguous.
drop function if exists public.validate_code(uuid, text);
-- p_redeem=false → "peek" only (no mutation): returns status 'valid' for a
-- still-claimable code so the caisse can SHOW it before staff confirm.
-- p_redeem=true (default) → atomically marks it redeemed = collected, so a code
-- can never be collected twice.
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

-- ── customer_summary: balance + history + active codes (caisse + /fidelite) ──
create or replace function public.customer_summary(p_business uuid, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
begin
  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = p_business and customer_phone = p_phone;
  return jsonb_build_object(
    'balance', v_balance,
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('delta', delta, 'reason', reason, 'note', note, 'created_at', created_at)
                       order by created_at desc)
      from (select delta, reason, note, created_at from public.points_ledger
            where business_id = p_business and customer_phone = p_phone
            order by created_at desc limit 12) r), '[]'::jsonb),
    'activeWins', coalesce((
      select jsonb_agg(jsonb_build_object('code', code, 'label', prize_label, 'expires_at', expires_at, 'created_at', created_at)
                       order by created_at desc)
      from public.wins
      where business_id = p_business and customer_phone = p_phone and status = 'pending' and expires_at > now()), '[]'::jsonb),
    'activeRedemptions', coalesce((
      select jsonb_agg(jsonb_build_object('code', code, 'label', reward_label, 'expires_at', expires_at, 'created_at', created_at)
                       order by created_at desc)
      from public.loyalty_redemptions
      where business_id = p_business and customer_phone = p_phone and status = 'pending' and expires_at > now()), '[]'::jsonb)
  );
end; $$;

-- ── grants: routes are the auth boundary, they call as service_role ───
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.play_game(text,text,text)',
    'public.redeem_reward(text,text,uuid)',
    'public.award_points(uuid,text,numeric,text)',
    'public.validate_code(uuid,text,boolean)',
    'public.customer_summary(uuid,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
