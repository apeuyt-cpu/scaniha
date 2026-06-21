-- Security hardening migration (2026-06-20) — accompanies the fix fleet.
-- Idempotent. Apply via: node scripts/apply-sql-api.mjs supabase/sec_hardening_2026_06.sql

-- ── #9 Survey flood: one response per (business, gate, device) ───────────────
-- The route now upserts with onConflict (business_id, gate_id, device_id) and
-- ignoreDuplicates. That needs a matching unique index. First collapse any
-- existing duplicate NON-NULL device rows (anonymous NULL-device rows are left
-- intact — they're distinct under a standard unique index anyway).
delete from public.game_survey_responses a
using public.game_survey_responses b
where a.business_id = b.business_id
  and a.gate_id = b.gate_id
  and a.device_id = b.device_id
  and a.device_id is not null
  and a.ctid < b.ctid;

create unique index if not exists game_survey_responses_dedup
  on public.game_survey_responses (business_id, gate_id, device_id);

-- ── #8 API keys: least-privilege default ─────────────────────────────────────
-- New keys are read-only unless write is explicitly requested (the app now sets
-- scopes explicitly in createApiKey; this aligns the column default for any
-- other path). Existing keys are unchanged.
alter table public.api_keys
  alter column scopes set default array['loyalty:read']::text[];
