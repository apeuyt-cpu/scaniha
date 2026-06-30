-- Global platform settings — a tiny key/value store for super-admin-controlled
-- switches that must be readable at runtime (so they can't be plain env vars).
-- First use: 'self_signup' = { "enabled": bool } drives whether public visitors
-- can create their own account (/signup) or must go through the request form
-- (/business-request → Demandes queue). Read/written ONLY via the service role
-- (super-admin server routes); RLS is on with no policies, so anon/auth cannot
-- touch it.

create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
-- No policies on purpose: only the service-role key (which bypasses RLS) reads
-- or writes this table. Anon and authenticated roles get nothing.

notify pgrst, 'reload schema';
