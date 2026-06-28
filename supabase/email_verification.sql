-- Email verification for owner sign-up flow.
-- Requires: Resend API key + MAIL_FROM env vars.
-- Run after deploying: verify the profiles table already exists (it should).

-- 1. Add email_verified column to profiles (skip if already exists)
alter table public.profiles add column if not exists email_verified boolean not null default false;

-- 2. Verification codes table (single-use, short-lived, hashed)
create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

-- Speed up lookups by email (most common query path)
create index if not exists idx_verification_codes_email on public.verification_codes (email);

-- Speed up expiry sweeps
create index if not exists idx_verification_codes_expires_at on public.verification_codes (expires_at);
