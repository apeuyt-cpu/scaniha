-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha — audit fixes (2026-06-24).
-- I5: pos_recompute taxed the PRE-discount gross, so the stored/printed TVA on a
--     discounted ticket didn't match the amount actually collected (net+TVA
--     identity broken). Fix: scale the embedded TVA by net/gross.
-- (I4 — double welcome-bonus — handled separately by an advisory lock inside
--  play_game; a bare unique index here could error a legit concurrent RPC or
--  fail to create over pre-existing duplicates, so it's done carefully there.)
-- Apply:  node scripts/apply-sql-api.mjs supabase/audit_fixes.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── I5: discount-proportional embedded TVA ───────────────────────────────────
create or replace function public.pos_recompute(p_sale uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_gross numeric(10,3) := 0;
  v_tax numeric(10,3) := 0;
  v_disc numeric(10,3) := 0;
  v_kind text; v_val numeric(10,3); v_round numeric(10,3);
begin
  select coalesce(sum(line_total),0),
         coalesce(sum(line_total - (line_total / (1 + tax_rate))),0)
    into v_gross, v_tax
    from public.pos_sale_items where sale_id = p_sale and void = false;
  select discount_kind, discount_value, rounding into v_kind, v_val, v_round from public.pos_sales where id = p_sale;
  if v_kind = 'pct' then v_disc := round(v_gross * coalesce(v_val,0) / 100, 3);
  elsif v_kind = 'amount' then v_disc := least(coalesce(v_val,0), v_gross);
  else v_disc := 0; end if;
  update public.pos_sales
     set subtotal = v_gross,
         -- TVA scaled to the net actually paid (was computed on the gross).
         tax_total = round(v_tax * (v_gross - v_disc) / nullif(v_gross, 0), 3),
         discount_total = v_disc,
         total = v_gross - v_disc + coalesce(v_round,0)
   where id = p_sale;
end; $$;

grant execute on function public.pos_recompute(uuid) to service_role;

notify pgrst, 'reload schema';
