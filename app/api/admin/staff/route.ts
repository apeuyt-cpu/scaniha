import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { listStaff, createStaff, deactivateStaff, resetLockout, businessHasStaff } from '@/lib/db/staff'
import { isStaffPinEnabled } from '@/lib/access/permissions'

export const dynamic = 'force-dynamic'

/**
 * Unified staff (app_staff) management + the "require PIN" opt-in flag.
 * Guarded by withStaff — only an actor with `staff.manage` (owner; managers do
 * NOT get it) can list/create/deactivate staff or toggle the café-wide flag, so a
 * cashier sharing the login can never escalate. (PIN off / owner = full access.)
 *   GET                              → { staff, pinEnabled }
 *   POST { label, pin, role }        → create
 *   DELETE { id }                    → deactivate
 *   PATCH { pinEnabled } | { id, resetLockout }
 */
export const GET = withStaff('staff.manage', async (_req, { business }) => {
  return NextResponse.json({ staff: await listStaff(business.id), pinEnabled: isStaffPinEnabled(business) })
})

export const POST = withStaff('staff.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  const role = ['cashier', 'server', 'manager', 'owner'].indexOf(body?.role) !== -1 ? body.role : 'cashier'
  const r = await createStaff(business.id, null, label, pin, role)
  if (!r.ok) {
    const map: Record<string, string> = { label: 'Nom requis.', weak: 'Code PIN invalide (4 à 6 chiffres).', duplicate_label: 'Ce nom existe déjà.' }
    return NextResponse.json({ error: map[r.error || ''] || 'Ajout impossible.' }, { status: r.error === 'duplicate_label' ? 409 : 400 })
  }
  return NextResponse.json({ ok: true })
})

export const DELETE = withStaff('staff.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  const ok = await deactivateStaff(business.id, id)
  return NextResponse.json(ok ? { ok: true } : { error: 'Échec.' }, { status: ok ? 200 : 500 })
})

export const PATCH = withStaff('staff.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))

  if (typeof body?.id === 'string' && body?.resetLockout) {
    await resetLockout(business.id, body.id)
    return NextResponse.json({ ok: true })
  }

  if (typeof body?.pinEnabled === 'boolean') {
    if (body.pinEnabled && !(await businessHasStaff(business.id))) {
      return NextResponse.json({ error: 'Ajoutez au moins un membre du personnel avant d’exiger un PIN.' }, { status: 400 })
    }
    const sb: any = await createServiceRoleClient()
    const ds = business.design_settings && typeof business.design_settings === 'object' ? business.design_settings : {}
    const { error } = await sb.from('businesses').update({ design_settings: { ...ds, staffPinEnabled: body.pinEnabled } }).eq('id', business.id)
    if (error) return NextResponse.json({ error: 'Échec.' }, { status: 500 })
    return NextResponse.json({ ok: true, pinEnabled: body.pinEnabled })
  }

  return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
})
