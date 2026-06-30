-- ════════════════════════════════════════════════════════════════════
-- Security fix — close the two CRITICAL "RLS Disabled in Public" advisor
-- findings. Run once in the Supabase SQL editor.
--
-- Today, with RLS OFF, ANYONE holding the public anon key can read AND write
-- public.design_selections / public.design_versions (verified: anon SELECT
-- succeeds; design_selections already holds rows with business_id + design_type
-- + description). That is an open door.
--
-- Neither table is referenced anywhere in the app code, so enabling RLS does
-- NOT affect the app. With RLS ON and no policy, the anon/public role is denied,
-- while the service_role (used by the server) BYPASSES RLS and keeps working.
-- ════════════════════════════════════════════════════════════════════

alter table public.design_selections enable row level security;
alter table public.design_versions  enable row level security;

-- ── OPTIONAL ──────────────────────────────────────────────────────────
-- Only if a logged-in OWNER dashboard should read/write these per business.
-- design_selections has a business_id column, so this mirrors the rest of the
-- schema (an owner manages only their own rows; service_role still bypasses).
-- Leave commented unless you actually have such an owner-facing feature.
--
-- drop policy if exists design_selections_owner_all on public.design_selections;
-- create policy design_selections_owner_all on public.design_selections
--   for all using (
--     business_id in (select id from public.businesses where owner_id = auth.uid())
--   ) with check (
--     business_id in (select id from public.businesses where owner_id = auth.uid())
--   );

-- NOTE: if some PUBLIC (anon) form writes to design_selections, the rows above
-- will start failing after this runs — tell me and I'll add a scoped insert
-- policy instead. (No app code does this today, so it should be safe.)
