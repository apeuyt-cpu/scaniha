import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { updateBusinessRequest, getBusinessRequest } from '@/lib/db/business-requests'

// Super-admin triage for a single onboarding request: mark contacted, reject, or
// save an internal note. APPROVAL (creating the café) is handled by
// POST /api/super-admin/businesses with { requestId } — not here.

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user: actor } = await requireSuperAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1500) : undefined

    const existing = await getBusinessRequest(id)
    if (!existing) {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }
    if (existing.status === 'converted') {
      return NextResponse.json({ error: 'Cette demande a déjà été convertie en compte.' }, { status: 409 })
    }

    const patch: any = { handled_by: actor.id }
    if (action === 'reject') patch.status = 'rejected'
    else if (action === 'contacted') patch.status = 'contacted'
    else if (action === 'reopen') patch.status = 'new'
    else if (action !== 'note') {
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
    }
    if (notes !== undefined) patch.notes = notes

    await updateBusinessRequest(id, patch)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('[super-admin/demandes] PATCH error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
