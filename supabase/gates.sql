-- "Conditions pour jouer" (play gates) — survey responses.
-- The gate CONFIG lives in games.config.gates (jsonb) — no table needed for it.
-- This table only stores survey ANSWERS so the owner can read them later.
-- Writes go through the service-role API route; owners read their own rows.

create table if not exists public.game_survey_responses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  gate_id text not null,
  device_id text,
  customer_phone text,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_survey_responses_biz on public.game_survey_responses(business_id, created_at);

alter table public.game_survey_responses enable row level security;

drop policy if exists survey_owner_read on public.game_survey_responses;
create policy survey_owner_read on public.game_survey_responses
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
-- No anon/public policy → only the service-role API route inserts.

notify pgrst, 'reload schema';
