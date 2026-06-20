-- ════════════════════════════════════════════════════════════════════
-- Scaniha — "Super Eyes": platform-wide audit log.
-- Every config/admin write (by ANY user — owner, super_admin, or service
-- role) is captured uniformly via exception-safe AFTER triggers. The triggers
-- swallow their own errors so auditing can NEVER block the real operation.
-- High-volume customer events (plays/wins/points) are intentionally NOT
-- triggered (they already live in their own tables + the Activity page) to
-- keep this table lean on the free tier.
-- Run once (idempotent):
--   node scripts/apply-sql-api.mjs supabase/audit_log.sql
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,                         -- auth.uid() of whoever did it (null = service role / system)
  actor_role  text,                         -- 'super_admin' | 'owner' | 'system' | …
  action      text not null,                -- 'INSERT' | 'UPDATE' | 'DELETE' | 'impersonate.start' | …
  table_name  text not null,
  row_id      text,
  business_id uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_log_created on public.audit_log (created_at desc);
create index if not exists idx_audit_log_business on public.audit_log (business_id, created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists audit_log_superadmin_read on public.audit_log;
create policy audit_log_superadmin_read on public.audit_log
  for select using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

-- The generic trigger (SECURITY DEFINER so it can read profiles + insert past
-- RLS; exception-safe so a logging failure never rolls back the real write).
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_row  jsonb;
  v_biz  text;
begin
  begin
    select role into v_role from public.profiles where user_id = auth.uid();
    v_row := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
    v_biz := case
      when TG_TABLE_NAME = 'businesses' then v_row->>'id'
      -- prizes has no business_id (keyed by game_id) — derive it via the parent game.
      when TG_TABLE_NAME = 'prizes' then (select g.business_id::text from public.games g where g.id = (v_row->>'game_id')::uuid)
      else v_row->>'business_id'
    end;
    insert into public.audit_log (actor, actor_role, action, table_name, row_id, business_id)
    values (auth.uid(), coalesce(v_role, 'system'), TG_OP, TG_TABLE_NAME, v_row->>'id', nullif(v_biz, '')::uuid);
  exception when others then
    null; -- auditing must NEVER break the real operation
  end;
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

-- Attach to the config/admin tables that exist.
do $$
declare t text;
begin
  foreach t in array array['businesses','categories','items','loyalty_programs','loyalty_rewards','games','prizes','payment_requests']
  loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('drop trigger if exists audit_%I on public.%I', t, t);
      execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t, t);
    end if;
  end loop;
end $$;
