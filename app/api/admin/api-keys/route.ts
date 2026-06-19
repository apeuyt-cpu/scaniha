import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/api/keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner-facing management of the public Loyalty API keys (NOT key-authed — this
 * is the session-authed admin surface, mirroring app/api/admin/caisse/route.ts).
 *
 *   GET    → list this business's keys (public fields only, never the raw key)
 *   POST   { name } → mint a key; returns the raw key ONCE (never shown again)
 *   DELETE { id }   → revoke a key (scoped to this business via the id+business
 *                     predicate inside revokeApiKey — IDOR guard for admins)
 *
 * Uses the LEGACY { error: '...' } envelope (internal admin route, consistent
 * with caisse / super-admin) — the structured v1 envelope is /api/v1/* only.
 */

async function resolveBusiness() {
  const { user } = await requireOwner()
  const business = await getActiveBusiness()
  if (!business) return null
  return business
}

export async function GET() {
  try {
    const business = await resolveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const keys = await listApiKeys(business.id)
    return NextResponse.json({ keys })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin api-keys:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const business = await resolveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || 'Clé API').slice(0, 60)
    const created = await createApiKey(business.id, name)
    // raw shown ONCE — the caller must surface "copiez-la maintenant".
    return NextResponse.json({
      id: created.id,
      raw: created.raw,
      key_prefix: created.prefix,
      name: created.name,
      created_at: created.createdAt,
    })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin api-keys:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const business = await resolveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
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
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin api-keys:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
