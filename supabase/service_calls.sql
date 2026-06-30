-- ════════════════════════════════════════════════════════════════════════════
-- Scaniha — "Appel serveur" (call waiter / ask for the bill).
-- A diner at a table taps a button; the staff console shows the call live and
-- marks it done. Presence-gated exactly like orders (must have scanned the table
-- QR). No public insert policy — calls are created ONLY via the service-role API
-- route, AFTER the scan-presence cookie is verified. Idempotent. Apply:
--   node scripts/apply-sql-api.mjs supabase/service_calls.sql
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.service_calls (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  table_number  text not null,
  kind          text not null default 'service' check (kind in ('service','bill')),
  status        text not null default 'open' check (status in ('open','done')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

-- Open calls per café, newest first (the staff banner query).
create index if not exists service_calls_biz_status_time
  on public.service_calls (business_id, status, created_at desc);

-- At most ONE open call per table + kind — the DB enforces the dedup (kills the
-- check-then-insert race; a concurrent duplicate hits this and is treated as ok).
create unique index if not exists service_calls_one_open
  on public.service_calls (business_id, table_number, kind) where status = 'open';

alter table public.service_calls enable row level security;

-- Owners read/resolve their own café's calls; super-admin everything. No public
-- insert (the route uses the service role after verifying presence).
drop policy if exists service_calls_owner_select on public.service_calls;
create policy service_calls_owner_select on public.service_calls for select
  using (exists (select 1 from public.businesses b where b.id = service_calls.business_id and b.owner_id = auth.uid()));
drop policy if exists service_calls_owner_update on public.service_calls;
create policy service_calls_owner_update on public.service_calls for update
  using (exists (select 1 from public.businesses b where b.id = service_calls.business_id and b.owner_id = auth.uid()));
drop policy if exists service_calls_super on public.service_calls;
create policy service_calls_super on public.service_calls for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));
