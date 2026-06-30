-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha POS — SALES ENGINE (ticket → lines → payments). Server-priced, atomic,
-- idempotent. Forked from orders.sql / place_order. Prices are recomputed in the
-- DB from pos_products — the client total is NEVER trusted. Prices are TTC
-- (tax-inclusive, café norm); tax_total is the embedded TVA breakdown.
-- Apply (after pos_core.sql):  node scripts/apply-sql-api.mjs supabase/pos_sales.sql
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pos_sales (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  branch_id       uuid references public.pos_branches(id) on delete set null,
  table_id        uuid,                       -- FK added in the tables phase (P3)
  table_label     text,
  status          text not null default 'open' check (status in ('open','billing','paid','voided','refunded')),
  opened_by       uuid,                       -- pos_staff.id
  server_label    text,
  subtotal        numeric(10,3) not null default 0,   -- gross TTC before discount
  discount_kind   text check (discount_kind in ('pct','amount')),
  discount_value  numeric(10,3) not null default 0,
  discount_total  numeric(10,3) not null default 0,
  tax_total       numeric(10,3) not null default 0,    -- embedded TVA
  rounding        numeric(10,3) not null default 0,
  total           numeric(10,3) not null default 0,
  receipt_snapshot jsonb,
  paid_at         timestamptz,
  voided_by       uuid,
  void_reason     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pos_sales_open on public.pos_sales (business_id, branch_id, status, created_at desc);
create unique index if not exists pos_sales_one_open_per_table
  on public.pos_sales (table_id) where status in ('open','billing') and table_id is not null;

create table if not exists public.pos_sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.pos_sales(id) on delete cascade,
  product_id   uuid,                          -- snapshot survives product deletion
  name         text not null,
  unit_price   numeric(10,3) not null,        -- frozen at add time (base + modifiers)
  qty          int not null check (qty > 0),
  tax_rate     numeric(5,3) not null default 0,
  modifiers    jsonb not null default '[]'::jsonb,
  line_total   numeric(10,3) not null,
  void         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists pos_sale_items_sale on public.pos_sale_items (sale_id);

create table if not exists public.pos_sale_payments (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.pos_sales(id) on delete cascade,
  business_id uuid not null,
  method      text not null check (method in ('cash','card','other')),
  amount      numeric(10,3) not null,
  tendered    numeric(10,3),
  change_due  numeric(10,3),
  idem_key    text unique,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists pos_sale_payments_sale on public.pos_sale_payments (sale_id);

create or replace function public.pos_sales_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists pos_sales_touch_trg on public.pos_sales;
create trigger pos_sales_touch_trg before update on public.pos_sales for each row execute function public.pos_sales_touch();

-- ── RLS (owner reads own, super-admin all; writes via SECURITY DEFINER only) ──
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;
alter table public.pos_sale_payments enable row level security;

drop policy if exists pos_sales_owner on public.pos_sales;
create policy pos_sales_owner on public.pos_sales for select
  using (exists (select 1 from public.businesses b where b.id = pos_sales.business_id and b.owner_id = auth.uid()));
drop policy if exists pos_sales_super on public.pos_sales;
create policy pos_sales_super on public.pos_sales for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists pos_sale_items_owner on public.pos_sale_items;
create policy pos_sale_items_owner on public.pos_sale_items for select
  using (exists (select 1 from public.pos_sales s join public.businesses b on b.id = s.business_id
                 where s.id = pos_sale_items.sale_id and b.owner_id = auth.uid()));
drop policy if exists pos_sale_items_super on public.pos_sale_items;
create policy pos_sale_items_super on public.pos_sale_items for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists pos_sale_payments_owner on public.pos_sale_payments;
create policy pos_sale_payments_owner on public.pos_sale_payments for select
  using (exists (select 1 from public.businesses b where b.id = pos_sale_payments.business_id and b.owner_id = auth.uid()));
drop policy if exists pos_sale_payments_super on public.pos_sale_payments;
create policy pos_sale_payments_super on public.pos_sale_payments for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

-- ── recompute: single source of truth for a ticket's money ───────────────────
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
         tax_total = round(v_tax, 3),
         discount_total = v_disc,
         total = v_gross - v_disc + coalesce(v_round,0)
   where id = p_sale;
end; $$;

-- ── open / add / set line / discount / pay ───────────────────────────────────
create or replace function public.pos_open_sale(p_business uuid, p_branch uuid, p_table uuid, p_table_label text, p_opened_by uuid, p_server text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.pos_sales (business_id, branch_id, table_id, table_label, opened_by, server_label, status)
    values (p_business, p_branch, p_table, nullif(btrim(coalesce(p_table_label,'')),''), p_opened_by, nullif(btrim(coalesce(p_server,'')),''), 'open')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'saleId', v_id);
exception when unique_violation then
  -- a sale is already open on this table
  select id into v_id from public.pos_sales where table_id = p_table and status in ('open','billing') limit 1;
  return jsonb_build_object('ok', true, 'saleId', v_id, 'reused', true);
end; $$;

create or replace function public.pos_add_line(p_business uuid, p_sale uuid, p_product uuid, p_qty int, p_modifiers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_prod record; v_qty int; v_unit numeric(10,3); v_delta numeric(10,3) := 0; m jsonb;
begin
  if not exists (select 1 from public.pos_sales where id = p_sale and business_id = p_business and status = 'open') then
    return jsonb_build_object('ok', false, 'error', 'sale_not_open');
  end if;
  select id, name, price, tax_rate into v_prod
    from public.pos_products where id = p_product and business_id = p_business and available = true limit 1;
  if v_prod.id is null then return jsonb_build_object('ok', false, 'error', 'bad_product'); end if;
  v_qty := greatest(1, least(99, coalesce(p_qty, 1)));
  if jsonb_typeof(p_modifiers) = 'array' then
    for m in select * from jsonb_array_elements(coalesce(p_modifiers,'[]'::jsonb)) loop
      v_delta := v_delta + coalesce((m->>'priceDelta')::numeric, 0);
    end loop;
  end if;
  v_unit := v_prod.price + v_delta;
  insert into public.pos_sale_items (sale_id, product_id, name, unit_price, qty, tax_rate, modifiers, line_total)
    values (p_sale, v_prod.id, v_prod.name, v_unit, v_qty, coalesce(v_prod.tax_rate,0), coalesce(p_modifiers,'[]'::jsonb), v_unit * v_qty);
  perform public.pos_recompute(p_sale);
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.pos_set_line(p_business uuid, p_sale uuid, p_line uuid, p_qty int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_unit numeric(10,3); v_qty int;
begin
  if not exists (select 1 from public.pos_sales where id = p_sale and business_id = p_business and status = 'open') then
    return jsonb_build_object('ok', false, 'error', 'sale_not_open');
  end if;
  select unit_price into v_unit from public.pos_sale_items where id = p_line and sale_id = p_sale;
  if v_unit is null then return jsonb_build_object('ok', false, 'error', 'bad_line'); end if;
  v_qty := coalesce(p_qty, 0);
  if v_qty <= 0 then
    delete from public.pos_sale_items where id = p_line and sale_id = p_sale;
  else
    v_qty := least(99, v_qty);
    update public.pos_sale_items set qty = v_qty, line_total = v_unit * v_qty where id = p_line and sale_id = p_sale;
  end if;
  perform public.pos_recompute(p_sale);
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.pos_apply_discount(p_business uuid, p_sale uuid, p_kind text, p_value numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.pos_sales where id = p_sale and business_id = p_business and status = 'open') then
    return jsonb_build_object('ok', false, 'error', 'sale_not_open');
  end if;
  if p_kind is null then
    update public.pos_sales set discount_kind = null, discount_value = 0 where id = p_sale;
  elsif p_kind in ('pct','amount') then
    update public.pos_sales set discount_kind = p_kind, discount_value = greatest(0, coalesce(p_value,0)) where id = p_sale;
  end if;
  perform public.pos_recompute(p_sale);
  return jsonb_build_object('ok', true);
end; $$;

-- pos_pay: idempotent close. p_payments = [{ method, amount, tendered }].
create or replace function public.pos_pay(p_business uuid, p_sale uuid, p_payments jsonb, p_idem text, p_paid_by uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sale record; v_sum numeric(10,3) := 0; v_tendered numeric(10,3) := 0; v_change numeric(10,3) := 0; p jsonb;
begin
  -- idempotency: a replay of the same click returns the already-paid ticket
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
  -- free the table when the tables phase is live
  update public.pos_sales set table_id = table_id where id = p_sale; -- no-op placeholder for P3 table release
  return jsonb_build_object('ok', true, 'saleId', p_sale, 'total', v_sale.total, 'change', v_change);
end; $$;

-- ── grants ───────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.pos_recompute(uuid)',
    'public.pos_open_sale(uuid,uuid,uuid,text,uuid,text)',
    'public.pos_add_line(uuid,uuid,uuid,int,jsonb)',
    'public.pos_set_line(uuid,uuid,uuid,int)',
    'public.pos_apply_discount(uuid,uuid,text,numeric)',
    'public.pos_pay(uuid,uuid,jsonb,text,uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
