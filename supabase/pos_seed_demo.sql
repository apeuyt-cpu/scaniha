-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha POS — demo seed for the test café "asdsad" (Saveurs). Idempotent:
-- only seeds if that café has no pos_products yet. Enables POS + a primary branch.
-- Apply:  node scripts/apply-sql-api.mjs supabase/pos_seed_demo.sql
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_biz uuid; v_branch uuid;
begin
  select id into v_biz from public.businesses where slug = 'asdsad' limit 1;
  if v_biz is null then raise notice 'asdsad not found, skipping'; return; end if;

  -- enable POS in design_settings.pos
  update public.businesses
     set design_settings = coalesce(design_settings, '{}'::jsonb) || jsonb_build_object('pos', jsonb_build_object('enabled', true))
   where id = v_biz;

  v_branch := public.pos_ensure_primary_branch(v_biz, 'Saveurs');

  if not exists (select 1 from public.pos_products where business_id = v_biz) then
    insert into public.pos_products (business_id, branch_id, category, name, price, tax_rate, sort) values
      (v_biz, v_branch, 'Boissons', 'Express',        2.500, 0.07, 1),
      (v_biz, v_branch, 'Boissons', 'Cappuccino',     3.500, 0.07, 2),
      (v_biz, v_branch, 'Boissons', 'Thé à la menthe',2.000, 0.07, 3),
      (v_biz, v_branch, 'Boissons', 'Jus d''orange',  4.000, 0.07, 4),
      (v_biz, v_branch, 'Boissons', 'Eau minérale',   1.500, 0.07, 5),
      (v_biz, v_branch, 'Pâtisserie', 'Croissant',    2.200, 0.07, 6),
      (v_biz, v_branch, 'Pâtisserie', 'Pain au chocolat', 2.500, 0.07, 7),
      (v_biz, v_branch, 'Pâtisserie', 'Mille-feuille',4.500, 0.07, 8),
      (v_biz, v_branch, 'Plats', 'Sandwich thon',     6.000, 0.07, 9),
      (v_biz, v_branch, 'Plats', 'Salade César',      9.500, 0.07, 10),
      (v_biz, v_branch, 'Plats', 'Pizza Margherita',  12.000, 0.07, 11),
      (v_biz, v_branch, 'Plats', 'Pâtes Bolognaise',  11.000, 0.07, 12);
    raise notice 'seeded 12 demo products for asdsad';
  else
    raise notice 'asdsad already has products, skipping seed';
  end if;
end $$;
