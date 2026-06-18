import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { listStaffPins, createStaffPin, deactivateStaffPin } from '@/lib/db/staff-pins'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner-facing management of the caisse staff PINs (session-authed admin
 * surface, mirroring app/api/admin/api-keys/route.ts).
 *
 *   GET    → list this business's ACTIVE pins (public fields only, never pin_hash)
 *   POST   { label, pin } → add a pin (4–6 digits); hashing happens in Postgres
 *   DELETE { id }         → deactivate a pin (scoped to this business via the
 *                           id+business predicate inside deactivateStaffPin)
 *
 * Uses the LEGACY { error: '...' } envelope (internal admin route). The raw PIN
 * is NEVER echoed back.
 */

async function resolveBusiness() {
  const { user } = await requireOwner()
  const business = await getBusinessByOwner(user.id)
  if (!business || business.owner_id !== user.id) return null
  return business
}

export async function GET() {
  try {
    const business = await resolveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const pins = await listStaffPins(business.id)
    return NextResponse.json({ pins })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin staff-pins:', error?.message)
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
    const label = String(body.label || '').slice(0, 40)
    const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
    if (!/^[0-9]{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'Le code doit contenir 4 à 6 chiffres.' }, { status: 400 })
    }
    try {
      const created = await createStaffPin(business.id, label, pin)
      // Never echo the raw PIN — only the public row.
      return NextResponse.json(created)
    } catch (e: any) {
      const reason = e?.message
      if (reason === 'duplicate_label') {
        return NextResponse.json({ error: 'Ce code PIN existe déjà pour ce membre.' }, { status: 409 })
      }
      if (reason === 'label') {
        return NextResponse.json({ error: 'Donnez un nom à ce code.' }, { status: 400 })
      }
      if (reason === 'weak') {
        return NextResponse.json({ error: 'Le code doit contenir 4 à 6 chiffres.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin staff-pins:', error?.message)
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
      return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 })
    }
    // The business_id predicate inside deactivateStaffPin prevents touching another café's pin.
    const ok = await deactivateStaffPin(business.id, id)
    if (!ok) {
      return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ deactivated: true })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('admin staff-pins:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
