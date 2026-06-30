/**
 * Tiny client for the server-authoritative design/branding/settings writes
 * (app/api/admin/design/route.ts). These writes used to go straight to the
 * businesses row via the anon client (RLS-gated) — but RLS can't read the staff
 * PIN cookie, so a staff member without the capability could still write. The
 * route guards each action with `withStaff` and busts the public menu cache
 * server-side, so callers no longer need to revalidate the menu themselves.
 *
 * Throws on failure with the server's French error message so existing
 * try/catch + toast flows keep working unchanged.
 */
export async function designApi(
  action: string,
  payload: Record<string, unknown>
): Promise<any> {
  const res = await fetch('/api/admin/design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json && json.error) || 'Échec de la mise à jour.')
  }
  return json
}
