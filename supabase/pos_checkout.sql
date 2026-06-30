-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha POS — one-shot atomic CHECKOUT (speed).
-- The terminal now rings up the cart 100% LOCALLY (instant, zero round-trips per
-- tap) and calls this ONCE at payment. Server still reprices every line from
-- pos_products (client price never trusted), pays, and credits loyalty — all in
-- one transaction. Idempotent via the payment idem_key (replay never double-sells).
-- Apply (after pos_sales.sql + pos_loyalty.sql):
--   node scripts/apply-sql-api.mjs supabase/pos_checkout.sql
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.pos_checkout(
  p_business uuid, p_branch uuid, p_lines jsonb,
  p_discount_kind text, p_discount_value numeric,
  p_payments jsonb, p_idem text, p_paid_by uuid, p_phone text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sale uuid; v_prod record; ln jsonb; m jsonb; p jsonb;
  v_unit numeric(10,3); v_qty int; v_delta numeric(10,3);
  v_rec record; v_sum numeric(10,3) := 0; v_tendered numeric(10,3) := 0; v_change numeric(10,3) := 0;
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_loyalty jsonb := null;
begin
  -- fast replay path: the same click already produced a paid sale
  if p_idem is not null then
    select s.id into v_sale from public.pos_sale_payments pp
      join public.pos_sales s on s.id = pp.sale_id where pp.idem_key = p_idem limit 1;
    if v_sale is not null then
      select * into v_rec from public.pos_sales where id = v_sale;
      return jsonb_build_object('ok', true, 'replay', true, 'saleId', v_sale, 'total', v_rec.total);
    end if;
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_payment');
  end if;

  insert into public.pos_sales (business_id, branch_id, status, opened_by, discount_kind, discount_value)
    values (p_business, p_branch, 'open', p_paid_by,
            case when p_discount_kind in ('pct','amount') then p_discount_kind else null end,
            greatest(0, coalesce(p_discount_value, 0)))
    returning id into v_sale;

  -- server-priced lines (client price NEVER trusted)
  for ln in select * from jsonb_array_elements(p_lines) loop
    select id, name, price, tax_rate into v_prod from public.pos_products
      where id = (ln->>'productId')::uuid and business_id = p_business and available = true limit 1;
    if v_prod.id is not null then
      v_qty := greatest(1, least(99, coalesce((ln->>'qty')::int, 1)));
      v_delta := 0;
      if jsonb_typeof(ln->'modifiers') = 'array' then
        for m in select * from jsonb_array_elements(ln->'modifiers') loop
          v_delta := v_delta + coalesce((m->>'priceDelta')::numeric, 0);
        end loop;
      end if;
      v_unit := v_prod.price + v_delta;
      insert into public.pos_sale_items (sale_id, product_id, name, unit_price, qty, tax_rate, modifiers, line_total)
        values (v_sale, v_prod.id, v_prod.name, v_unit, v_qty, coalesce(v_prod.tax_rate, 0), coalesce(ln->'modifiers', '[]'::jsonb), v_unit * v_qty);
    end if;
  end loop;

  if not exists (select 1 from public.pos_sale_items where sale_id = v_sale) then
    delete from public.pos_sales where id = v_sale;
    return jsonb_build_object('ok', false, 'error', 'no_valid_items');
  end if;

  perform public.pos_recompute(v_sale);
  select * into v_rec from public.pos_sales where id = v_sale;

  for p in select * from jsonb_array_elements(p_payments) loop
    v_sum := v_sum + coalesce((p->>'amount')::numeric, 0);
    v_tendered := v_tendered + coalesce((p->>'tendered')::numeric, (p->>'amount')::numeric, 0);
  end loop;
  if v_sum < v_rec.total then
    delete from public.pos_sales where id = v_sale;  -- nothing half-saved
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'total', v_rec.total);
  end if;
  v_change := greatest(0, v_tendered - v_rec.total);

  for p in select * from jsonb_array_elements(p_payments) loop
    insert into public.pos_sale_payments (sale_id, business_id, method, amount, tendered, change_due, idem_key, created_by)
      values (v_sale, p_business, coalesce(p->>'method','cash'), coalesce((p->>'amount')::numeric,0), (p->>'tendered')::numeric, null,
              case when (p = (p_payments->0)) then p_idem else null end, p_paid_by);
  end loop;

  update public.pos_sales set status = 'paid', paid_at = now(),
    receipt_snapshot = jsonb_build_object('total', v_rec.total, 'subtotal', v_rec.subtotal, 'tax_total', v_rec.tax_total,
      'discount_total', v_rec.discount_total, 'change', v_change, 'paid_at', now())
    where id = v_sale;

  if v_phone is not null and exists (select 1 from public.loyalty_programs where business_id = p_business) then
    v_loyalty := public.award_points(p_business, v_phone, v_rec.total, 'Vente POS');
  end if;

  return jsonb_build_object('ok', true, 'saleId', v_sale, 'total', v_rec.total, 'change', v_change, 'loyalty', v_loyalty);
exception when unique_violation then
  -- concurrent double-submit of the same idem_key: the other request won; this
  -- whole transaction rolls back (no orphan sale) → report as replay.
  return jsonb_build_object('ok', true, 'replay', true);
end; $$;

grant execute on function public.pos_checkout(uuid, uuid, jsonb, text, numeric, jsonb, text, uuid, text) to service_role;

notify pgrst, 'reload schema';
