-- ════════════════════════════════════════════════════════════════════
-- Scaniha — let the SUPER-ADMIN fully manage ANY business's menu.
-- ADDITIVE RLS: grants super_admin full CRUD on categories + items, IN
-- ADDITION to the existing owner/public policies (which stay UNCHANGED, so
-- the owner editor is unaffected). super_admins are provisioned only via the
-- service role (profiles_guard pins clients to 'owner'), so no self-promotion.
-- Run once (idempotent):
--   node scripts/apply-sql-api.mjs supabase/superadmin_menu_rls.sql
-- ════════════════════════════════════════════════════════════════════

drop policy if exists categories_superadmin_all on public.categories;
create policy categories_superadmin_all on public.categories
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists items_superadmin_all on public.items;
create policy items_superadmin_all on public.items
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));
