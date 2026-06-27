-- ════════════════════════════════════════════════════════════════════
-- Scaniha — "Super Eyes": platform ACTIVITY log (deliberate user actions).
-- Records writes that carry a REAL signed-in user (owner / super_admin via the
-- browser client) via exception-safe AFTER triggers. AUTOMATIC / service-role /
-- background writes (auth.uid() IS NULL) are SKIPPED, so the feed shows what
-- people DID, not machine noise. Rich action events + page views are added
-- explicitly through lib/audit.ts. High-volume customer events (plays/wins/
-- points) are NOT triggered.
-- Run once (idempotent):
--   node scripts/apply-sql-api.mjs supabase/audit_log.sql
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,
  actor_role  text,
  action      text not null,
  table_name  text not null,
  row_id      text,
  business_id uuid,
  detail      text,                            -- human-readable detail (what changed / which page)
  created_at  timestamptz not null default now()
);
alter table public.audit_log add column if not exists detail text;
create index if not exists idx_audit_log_created on public.audit_log (created_at desc);
create index if not exists idx_audit_log_business on public.audit_log (business_id, created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists audit_log_superadmin_read on public.audit_log;
create policy audit_log_superadmin_read on public.audit_log
  for select using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin'));

-- Trigger (SECURITY DEFINER; exception-safe). Logs ONLY deliberate user writes:
-- service-role / automatic writes have no auth.uid() and are skipped entirely.
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_row  jsonb;
  v_biz  text;
begin
  -- Skip automatic / service-role / background writes (no signed-in user), and
  -- accounts excluded from Super Eyes (founder) — keep this array in sync with
  -- lib/audit-exclusions.ts.
  if auth.uid() is null
     or auth.uid() = any (array['3c147303-dbe5-4fbc-a411-0bc40c49182d']::uuid[]) then  -- saif@gmail.com
    return case when TG_OP = 'DELETE' then OLD else NEW end;
  end if;
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

-- Cleanup: drop automatic / service-role rows (actor IS NULL) AND any rows for
-- accounts excluded from Super Eyes, so the feed only shows tracked, deliberate
-- actions. Re-runnable; keep the array in sync with lib/audit-exclusions.ts.
delete from public.audit_log
 where actor is null
    or actor = any (array['3c147303-dbe5-4fbc-a411-0bc40c49182d']::uuid[]);  -- saif@gmail.com
