-- ════════════════════════════════════════════════════════════════════
-- Scaniha — let loyalty rewards (the boutique items) carry an image.
-- Adds a nullable image_url to loyalty_rewards (a Supabase-storage URL,
-- optimised + uploaded via /api/upload like every other image). Existing
-- select-* policies already expose it; no RLS change needed. Idempotent.
--   node scripts/apply-sql-api.mjs supabase/loyalty_reward_images.sql
-- ════════════════════════════════════════════════════════════════════
alter table public.loyalty_rewards add column if not exists image_url text;
