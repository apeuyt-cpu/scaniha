-- ════════════════════════════════════════════════════════════════════
-- Scaniha — let the SUPER-ADMIN fully manage ANY business via the real
-- owner admin ("Gérer comme l'établissement" / impersonation).
-- ADDITIVE RLS: grants super_admin full CRUD on the tables the owner editors
-- write to directly via the browser client, IN ADDITION to the existing
-- owner/public policies (which stay UNCHANGED). categories + items are already
-- covered by superadmin_menu_rls.sql — this file adds the remaining three.
-- super_admins are provisioned only via the service role (profiles_guard pins
-- clients to 'owner'), so there is no self-promotion path.
-- Run once (idempotent):
--   node scripts/apply-sql-api.mjs supabase/superadmin_full_rls.sql
-- ════════════════════════════════════════════════════════════════════

drop policy if exists businesses_superadmin_all on public.businesses;
create policy businesses_superadmin_all on public.businesses
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists loyalty_programs_superadmin_all on public.loyalty_programs;
create policy loyalty_programs_superadmin_all on public.loyalty_programs
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists loyalty_rewards_superadmin_all on public.loyalty_rewards;
create policy loyalty_rewards_superadmin_all on public.loyalty_rewards
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));
