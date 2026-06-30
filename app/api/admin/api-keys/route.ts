import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/api/keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner-facing management of the public Loyalty API keys (NOT key-authed — this
 * is the session-authed admin surface, mirroring app/api/admin/caisse/route.ts).
 * All methods require api.manage (owner-only when staff PINs are enabled).
 *
 *   GET    → list this business's keys (public fields only, never the raw key)
 *   POST   { name } → mint a key; returns the raw key ONCE (never shown again)
 *   DELETE { id }   → revoke a key (scoped to this business via the id+business
 *                     predicate inside revokeApiKey — IDOR guard for admins)
 *
 * Uses the LEGACY { error: '...' } envelope (internal admin route, consistent
 * with caisse / super-admin) — the structured v1 envelope is /api/v1/* only.
 */

export const GET = withStaff('api.manage', async (_req, { business }) => {
  const keys = await listApiKeys(business.id)
  return NextResponse.json({ keys })
})

export const POST = withStaff('api.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))
  const name = String(body.name || 'Clé API').slice(0, 60)
  // scopes are whitelisted inside createApiKey (sanitizeScopes) — an absent or
  // bogus list yields ['loyalty:read'] (read-only, least privilege).
  const scopes = Array.isArray(body.scopes) ? body.scopes : undefined
  const created = await createApiKey(business.id, name, scopes)
  // raw shown ONCE — the caller must surface "copiez-la maintenant".
  return NextResponse.json({
    id: created.id,
    raw: created.raw,
    key_prefix: created.prefix,
    name: created.name,
    scopes: created.scopes,
    created_at: created.createdAt,
  })
})

export const DELETE = withStaff('api.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'Clé introuvable.' }, { status: 404 })
  }
  // The business_id predicate inside revokeApiKey prevents revoking another café's key.
  const revoked = await revokeApiKey(business.id, id)
  if (!revoked) {
    return NextResponse.json({ error: 'Clé introuvable.' }, { status: 404 })
  }
  return NextResponse.json({ revoked: true })
})
