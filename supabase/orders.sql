-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha — QR table ordering ("passer une commande").
-- Diners scan a per-table QR (presence-gated), build a cart, place an order; the
-- staff see it live and move it through statuses. NO online payment (pay at table).
-- Pricing is computed SERVER-SIDE in place_order from the live items — the client
-- price is never trusted. Idempotent. Apply:
--   node scripts/apply-sql-api.mjs supabase/orders.sql
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  table_number  text not null,
  status        text not null default 'new'
                check (status in ('new','preparing','ready','delivered','rejected')),
  customer_name text,
  note          text,
  total         numeric(10,3) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  item_id   uuid,                       -- snapshot stays even if the item is later deleted
  name      text not null,
  price     numeric(10,3) not null,
  qty       int not null check (qty > 0)
);

create index if not exists orders_biz_status_time on public.orders (business_id, status, created_at desc);
create index if not exists order_items_order on public.order_items (order_id);

-- Idempotency key so a network drop / retry / double-submit never creates a
-- duplicate order: place_order returns the existing order for the same key.
alter table public.orders add column if not exists idem_key text;
create unique index if not exists orders_business_idem on public.orders (business_id, idem_key) where idem_key is not null;
-- Belt-and-suspenders: ensure total has its default (some legacy rows/columns lack it).
alter table public.orders alter column total set default 0;

-- updated_at maintenance (status changes).
create or replace function public.orders_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists orders_touch_trg on public.orders;
create trigger orders_touch_trg before update on public.orders
  for each row execute function public.orders_touch();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Owners read/update their own café's orders; super-admin everything. There is
-- NO public insert policy: diners place orders only through place_order (service
-- role), which runs AFTER the server verifies the scan-presence cookie.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select on public.orders for select
  using (exists (select 1 from public.businesses b where b.id = orders.business_id and b.owner_id = auth.uid()));
drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_update on public.orders for update
  using (exists (select 1 from public.businesses b where b.id = orders.business_id and b.owner_id = auth.uid()));
drop policy if exists orders_super on public.orders;
create policy orders_super on public.orders for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

drop policy if exists order_items_owner_select on public.order_items;
create policy order_items_owner_select on public.order_items for select
  using (exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
                 where o.id = order_items.order_id and b.owner_id = auth.uid()));
drop policy if exists order_items_super on public.order_items;
create policy order_items_super on public.order_items for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

-- ── place_order: atomic, server-priced ───────────────────────────────────────
-- p_items = jsonb array of { itemId: uuid, qty: int }. Each item is validated to
-- belong to THIS café (via category) and be available; price + total come from
-- the DB, never the client. Returns { ok, orderId, total } or { ok:false, error }.
drop function if exists public.place_order(uuid, text, text, text, jsonb);
create or replace function public.place_order(
  p_business uuid, p_table text, p_name text, p_note text, p_items jsonb, p_idem text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_total numeric(10,3) := 0;
  v_idem text := nullif(btrim(coalesce(p_idem, '')), '');
  v_existing_id uuid;
  v_existing_total numeric(10,3);
  r record;
  v_item record;
begin
  if p_table is null or length(btrim(p_table)) = 0 then return jsonb_build_object('ok', false, 'error', 'no_table'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then return jsonb_build_object('ok', false, 'error', 'empty'); end if;

  -- Idempotent replay: same (business, idem) returns the existing order, never a dup.
  -- (Separate vars — a SELECT INTO with no match would NULL out v_total otherwise.)
  if v_idem is not null then
    select id, total into v_existing_id, v_existing_total from public.orders where business_id = p_business and idem_key = v_idem limit 1;
    if v_existing_id is not null then return jsonb_build_object('ok', true, 'orderId', v_existing_id, 'total', coalesce(v_existing_total, 0)); end if;
  end if;

  begin
    insert into public.orders (business_id, table_number, customer_name, note, status, total, idem_key)
      values (p_business, btrim(p_table), nullif(btrim(coalesce(p_name, '')), ''), nullif(btrim(coalesce(p_note, '')), ''), 'new', 0, v_idem)
      returning id into v_order_id;
  exception when unique_violation then
    -- A concurrent request with the same idem won the race — return its order.
    select id, total into v_existing_id, v_existing_total from public.orders where business_id = p_business and idem_key = v_idem limit 1;
    if v_existing_id is not null then return jsonb_build_object('ok', true, 'orderId', v_existing_id, 'total', coalesce(v_existing_total, 0)); end if;
    return jsonb_build_object('ok', false, 'error', 'server');
  end;

  for r in
    select (e->>'itemId')::uuid as item_id,
           greatest(1, least(99, coalesce((e->>'qty')::int, 1))) as qty
    from jsonb_array_elements(p_items) e
    where (e->>'itemId') is not null
  loop
    select i.id, i.name, i.price into v_item
      from public.items i
      join public.categories c on c.id = i.category_id
      where i.id = r.item_id and c.business_id = p_business and i.available = true
      limit 1;
    if v_item.id is not null then
      insert into public.order_items (order_id, item_id, name, price, qty)
        values (v_order_id, v_item.id, v_item.name, coalesce(v_item.price, 0), r.qty);
      v_total := v_total + coalesce(v_item.price, 0) * r.qty;
    end if;
  end loop;

  if not exists (select 1 from public.order_items where order_id = v_order_id) then
    delete from public.orders where id = v_order_id;             -- nothing valid → no empty order
    return jsonb_build_object('ok', false, 'error', 'no_valid_items');
  end if;

  update public.orders set total = v_total where id = v_order_id;
  return jsonb_build_object('ok', true, 'orderId', v_order_id, 'total', v_total);
end; $$;

grant execute on function public.place_order(uuid, text, text, text, jsonb, text) to service_role;
