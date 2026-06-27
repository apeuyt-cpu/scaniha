-- Performance indexes (2026-06-23) — analytics + caisse-scan hot paths.
-- Idempotent (create index if not exists). Apply via:
--   node scripts/apply-sql-api.mjs supabase/perf_indexes_2026_06.sql

-- ── menu_views: analytics filters on (business_id, viewed_at) ────────────────
-- menu_views is the fastest-growing table and had no index on its hot filter,
-- so every admin/super-admin analytics load full-scanned it. A composite
-- (business_id, viewed_at) covers the per-business + time-window scans.
create index if not exists menu_views_biz_time on public.menu_views (business_id, viewed_at);

-- ── validate_code: caisse scan matches on normalized code ────────────────────
-- validate_code (and the decline path) filter on
--   business_id = … and upper(replace(code, '-', '')) = v_norm
-- The expression upper(replace(code,'-','')) defeats the plain code index, so
-- every scan full-scanned wins + loyalty_redemptions. Functional indexes on the
-- exact normalized expression make those lookups index seeks.
create index if not exists wins_code_norm on public.wins (business_id, upper(replace(code, '-', '')));
create index if not exists redemptions_code_norm on public.loyalty_redemptions (business_id, upper(replace(code, '-', '')));
