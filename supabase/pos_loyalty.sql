-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha POS ↔ FIDÉLITÉ — wire the POS sale to auto-credit loyalty points.
-- The fidelity system now has TWO entry points to the SAME points_ledger:
--   • MANUAL caisse (/admin/caisse, award_points typed by hand) — for cafés on
--     their OWN external POS.
--   • OUR POS (pos_pay) — credits points AUTOMATICALLY on the real ticket total.
-- Both call the same award_points (welcome bonus is first-toucher-once, so no
-- double welcome). The credit is INSIDE pos_pay's idem-guarded block, so a
-- replayed payment NEVER re-credits. p_phone is OPTIONAL: null = plain sale, no
-- points (today's behaviour, fully backward-compatible).
-- Apply (after pos_sales.sql):  node scripts/apply-sql-api.mjs supabase/pos_loyalty.sql
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.pos_pay(uuid, uuid, jsonb, text, uuid);

create or replace function public.pos_pay(
  p_business uuid, p_sale uuid, p_payments jsonb, p_idem text, p_paid_by uuid, p_phone text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sale record; v_sum numeric(10,3) := 0; v_tendered numeric(10,3) := 0; v_change numeric(10,3) := 0; p jsonb;
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_loyalty jsonb := null;
begin
  -- idempotency: a replay of the same click returns the already-paid ticket and
  -- NEVER re-credits points (this whole block is skipped on replay).
  if p_idem is not null and exists (select 1 from public.pos_sale_payments where idem_key = p_idem) then
    select * into v_sale from public.pos_sales where id = p_sale;
    return jsonb_build_object('ok', true, 'replay', true, 'saleId', p_sale, 'total', v_sale.total);
  end if;
  select * into v_sale from public.pos_sales where id = p_sale and business_id = p_business for update;
  if v_sale.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_sale.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'not_open'); end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_payment');
  end if;
  for p in select * from jsonb_array_elements(p_payments) loop
    v_sum := v_sum + coalesce((p->>'amount')::numeric, 0);
    v_tendered := v_tendered + coalesce((p->>'tendered')::numeric, (p->>'amount')::numeric, 0);
  end loop;
  if v_sum < v_sale.total then return jsonb_build_object('ok', false, 'error', 'insufficient', 'total', v_sale.total); end if;
  v_change := greatest(0, v_tendered - v_sale.total);

  for p in select * from jsonb_array_elements(p_payments) loop
    insert into public.pos_sale_payments (sale_id, business_id, method, amount, tendered, change_due, idem_key, created_by)
      values (p_sale, p_business,
        coalesce(p->>'method','cash'),
        coalesce((p->>'amount')::numeric,0),
        (p->>'tendered')::numeric,
        null,
        case when (p = (p_payments->0)) then p_idem else null end,
        p_paid_by);
  end loop;

  update public.pos_sales
     set status = 'paid', paid_at = now(),
         receipt_snapshot = jsonb_build_object(
           'total', v_sale.total, 'subtotal', v_sale.subtotal, 'tax_total', v_sale.tax_total,
           'discount_total', v_sale.discount_total, 'change', v_change, 'paid_at', now())
   where id = p_sale;

  -- ── Fidélité: crédit AUTOMATIQUE des points si un téléphone est fourni ──
  -- Même ledger que la caisse manuelle ; award_points gère le bonus de bienvenue
  -- une seule fois par (café, téléphone). Atomique : si le crédit échoue, la
  -- vente est annulée (rollback) plutôt que d'encaisser sans tracer — mais
  -- award_points ne lève pas, il renvoie {ok:false} (no_program/bad_amount),
  -- qu'on ignore (une vente sans programme fidélité reste une vente valide).
  if v_phone is not null
     and exists (select 1 from public.loyalty_programs where business_id = p_business) then
    v_loyalty := public.award_points(p_business, v_phone, v_sale.total, 'Vente POS');
  end if;

  return jsonb_build_object('ok', true, 'saleId', p_sale, 'total', v_sale.total, 'change', v_change, 'loyalty', v_loyalty);
end; $$;

grant execute on function public.pos_pay(uuid, uuid, jsonb, text, uuid, text) to service_role;

-- Refresh PostgREST's schema cache so the new 6-arg signature is callable.
notify pgrst, 'reload schema';
