import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Record an EXPLICIT platform event in audit_log — for "moves" that don't write
 * to a trigger-watched table (e.g. super-admin impersonation start/stop). The
 * table-level DB triggers (supabase/audit_log.sql) cover every config write;
 * this is for the rest. Best-effort: never throws.
 */
export async function logAudit(entry: {
  actor?: string | null
  actorRole?: string | null
  action: string
  table?: string
  rowId?: string | null
  businessId?: string | null
}) {
  try {
    const admin = await createServiceRoleClient()
    await (admin.from('audit_log') as any).insert({
      actor: entry.actor ?? null,
      actor_role: entry.actorRole ?? 'super_admin',
      action: entry.action,
      table_name: entry.table ?? 'event',
      row_id: entry.rowId ?? null,
      business_id: entry.businessId ?? null,
    })
  } catch {
    // auditing must never break the action it records
  }
}
