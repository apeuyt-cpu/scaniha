-- ════════════════════════════════════════════════════════════════════
-- Scaniha — Public Loyalty API keys (per-business, service-role only)
-- Run this once in the Supabase SQL editor. Re-runnable / idempotent
-- (same style as supabase/game.sql).
--
-- Keys authenticate the developer-facing /api/v1/* loyalty endpoints.
-- The raw key is NEVER stored — only its sha256 hex hash. Routes are the
-- auth boundary and call as service_role; nobody else may read this table.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- IDOR guard for the slug-keyed redeem_reward RPC: slugs must be globally
-- unique so a key's business_id always maps to exactly one slug (and vice
-- versa). Safe/idempotent — businesses.slug is already the public route key.
create unique index if not exists businesses_slug_unique_idx on public.businesses(slug);

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null default 'Clé API',
  key_prefix    text not null,                 -- e.g. "sk_live_a1b2c3d4" — shown in lists, NOT secret
  key_hash      text not null,                 -- sha256 hex of the full raw key
  scopes        text[] not null default array['loyalty:read','loyalty:write'],
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists api_keys_business_idx on public.api_keys(business_id);
create unique index if not exists api_keys_hash_idx on public.api_keys(key_hash);

-- RLS: NOBODY but service_role. (No owner/anon policies — routes are the auth boundary.)
alter table public.api_keys enable row level security;
revoke all on public.api_keys from anon, authenticated;
-- service_role bypasses RLS entirely; no policy needed for it.
