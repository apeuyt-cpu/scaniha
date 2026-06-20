-- Run this once in the Supabase dashboard → SQL Editor.
-- Creates the table that stores manual payment submissions (D17 / RIB / Flouci + receipts).

create extension if not exists pgcrypto;

create table if not exists public.payment_requests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  plan         text not null,
  method       text not null,
  full_name    text not null,
  amount       numeric,
  receipt_urls jsonb not null default '[]'::jsonb,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

create index if not exists payment_requests_business_idx on public.payment_requests (business_id);
create index if not exists payment_requests_status_idx on public.payment_requests (status);

-- RLS on: only the service role (used by the API route after verifying ownership,
-- and by the super-admin page) can read/write. No direct client access.
alter table public.payment_requests enable row level security;

-- ── Reviewer audit (Fix #4) ─────────────────────────────────────────────────
-- Records who approved/rejected and when, plus a mandatory motive when a
-- super-admin forces approval of a payment whose declared amount does not match
-- the expected price. All three are net-new; ADD COLUMN IF NOT EXISTS keeps this
-- block re-runnable.
alter table public.payment_requests add column if not exists reviewed_by uuid references auth.users(id);
alter table public.payment_requests add column if not exists reviewed_at timestamptz;
alter table public.payment_requests add column if not exists amount_override_reason text;
