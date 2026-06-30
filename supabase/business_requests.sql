-- ============================================================================
-- Scaniha — BUSINESS_REQUESTS: inbound café onboarding leads.
-- Run ONCE in the Supabase dashboard → SQL Editor. Idempotent (safe to re-run).
--
-- WHY: v2 replaces owner self-signup with a request → review → create flow. The
-- public /business-request form POSTs to /api/business-request (service role),
-- which inserts a row here. The super-admin "Demandes" queue reads/updates these
-- and, on approval, calls POST /api/super-admin/businesses to provision the café.
--
-- SECURITY model (matches menu_views / payment_requests): RLS ON, NO anon/owner
-- policies → writes happen ONLY through the service-role API routes (the auth
-- boundary lives in the route, not the table). super_admins may read + manage.
-- The service-role key bypasses RLS, so the routes keep working.
-- ============================================================================

begin;

create table if not exists public.business_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Lifecycle: new → contacted → approved → converted (café created) | rejected.
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'approved', 'converted', 'rejected')),

  -- What the prospect submitted.
  business_name text not null,
  contact_name  text not null,
  phone         text not null,
  email         text,
  city          text,
  -- Which product(s) they want: menu | fidelite | both | ordering | autre.
  product       text not null default 'menu',
  -- Plan they expressed interest in (free text / a PAYMENT_PLANS key).
  plan          text,
  message       text,
  source        text not null default 'website',

  -- Filled when the request is converted into a real café.
  business_id   uuid references public.businesses(id) on delete set null,
  -- Internal super-admin triage notes + who handled it.
  notes         text,
  handled_by    uuid
);

-- Newest-first queue + quick status filtering.
create index if not exists business_requests_status_created_idx
  on public.business_requests (status, created_at desc);

alter table public.business_requests enable row level security;

-- super_admins manage the whole queue (read + update status/notes + delete).
drop policy if exists business_requests_superadmin_all on public.business_requests;
create policy business_requests_superadmin_all on public.business_requests
  for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));
-- (No anon/owner INSERT policy: the public form writes via the service-role route.)

-- updated_at maintenance.
create or replace function public.business_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists business_requests_updated_at_trg on public.business_requests;
create trigger business_requests_updated_at_trg
  before update on public.business_requests
  for each row execute function public.business_requests_set_updated_at();

commit;

-- ============================================================================
-- After running: submit the public /business-request form and confirm a row
-- appears in the super-admin "Demandes" queue, then approve → café is created.
-- ============================================================================
