-- ════════════════════════════════════════════════════════════════════
-- Scaniha — Admin roulette (owner-operated "one-user" wheel)
-- Run this once in the Supabase SQL editor. Safe to re-paste (idempotent).
--
-- This is a SEPARATE system from the customer-facing roulette (games/prizes/
-- wins). The owner spins it at the counter for a walk-in, captures the
-- customer's phone, and the prize is saved against that phone — searchable
-- later and markable as claimed. Its own prizes/percentages, configured in
-- the admin settings popup; nothing here touches the visitor game.
-- ════════════════════════════════════════════════════════════════════

-- Prizes + their odds. weight stores a PERCENTAGE (the active prizes' weights
-- sum to 100, just like the customer wheel), so the owner sets "café = 15%".
create table if not exists public.admin_roulette_prizes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null default 'Lot',
  weight int not null default 1 check (weight >= 0),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- A win recorded at the counter: prize tied to a phone, claimable later.
create table if not exists public.admin_roulette_wins (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prize_id uuid references public.admin_roulette_prizes(id) on delete set null,
  prize_label text not null,
  customer_phone text not null,
  customer_name text,
  -- short human-friendly reference (e.g. "K7F-3QZ"); not unique, display only.
  code text,
  status text not null default 'pending' check (status in ('pending','claimed','cancelled')),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_arp_business on public.admin_roulette_prizes(business_id, position, created_at);
create index if not exists idx_arw_business_phone on public.admin_roulette_wins(business_id, customer_phone, created_at);
create index if not exists idx_arw_business_status on public.admin_roulette_wins(business_id, status, created_at);

-- ── Row level security ────────────────────────────────────────────────
-- The /api/admin/roulette route is the real auth boundary (requireOwner +
-- service role), but we mirror the rest of the game schema and lock these to
-- the owning business as belt-and-suspenders.
alter table public.admin_roulette_prizes enable row level security;
alter table public.admin_roulette_wins enable row level security;

drop policy if exists admin_roulette_prizes_owner_all on public.admin_roulette_prizes;
create policy admin_roulette_prizes_owner_all on public.admin_roulette_prizes
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

drop policy if exists admin_roulette_wins_owner_all on public.admin_roulette_wins;
create policy admin_roulette_wins_owner_all on public.admin_roulette_wins
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
