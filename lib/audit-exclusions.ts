/**
 * Accounts that must NEVER appear in the "Super Eyes" activity feed.
 *
 * Excluded at the SOURCE (logAudit + the DB trigger in supabase/audit_log.sql
 * skip these actors, so no new rows are recorded) and filtered from the feed
 * query as a safety net. Keep this list in sync with the matching array in
 * supabase/audit_log.sql.
 *
 *   saif@gmail.com → 3c147303-dbe5-4fbc-a411-0bc40c49182d  (founder, super-admin)
 */
export const SUPER_EYES_UNTRACKED_USER_IDS: readonly string[] = [
  '3c147303-dbe5-4fbc-a411-0bc40c49182d', // saif@gmail.com
]

/** True when this actor's activity should be kept out of Super Eyes. */
export function isUntrackedActor(userId?: string | null): boolean {
  return !!userId && SUPER_EYES_UNTRACKED_USER_IDS.includes(userId)
}
