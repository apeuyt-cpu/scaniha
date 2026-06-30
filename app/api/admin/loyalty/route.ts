import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Loyalty configuration — server-authoritative CRUD. The owner admin used to
 * write loyalty_programs/loyalty_rewards DIRECTLY from the browser's Supabase
 * anon client, gated only by RLS (owner_id = auth.uid()). When the owner turns
 * on staff PINs, a staff member without `loyalty.manage` still acts under the
 * owner's auth session, so RLS would let them write. RLS can't read the staff
 * HMAC cookie, so the only real fix is to move WRITES here, behind withStaff().
 * When PINs are off / owner / super-admin impersonating, getActiveStaff returns
 * owner-level ALL_CAPS → the guard is transparent (no behaviour change).
 */

// Loyalty tables may not be installed on a café yet. We never surface SQL to
// the owner — the client maps `provisioning` to a clear French message.
function isProvisioningError(err: any) {
  return (
    err?.code === '42P01' ||
    err?.message?.includes('does not exist') ||
    err?.message?.includes('schema cache')
  )
}

const DEFAULT_REWARDS = [
  { label: 'Café offert', points_cost: 50 },
  { label: 'Dessert offert', points_cost: 100 },
  { label: '-20% sur l’addition', points_cost: 200 },
]

/**
 * GET → { program, rewards, pending } for the active business. Loyalty is
 * intentionally simple (1 dinar = 1 point everywhere), so we self-heal any
 * legacy points_per_tnd != 1 here. When the tables aren't installed yet, return
 * { provisioning: true } so the client shows its existing setup card.
 */
export const GET = withStaff('page.fidelite', async (_req, { business }) => {
  try {
    const supabase: any = await createServiceRoleClient()

    const { data: program, error: pErr } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle()

    if (pErr) {
      if (isProvisioningError(pErr)) {
        return NextResponse.json({ program: null, rewards: [], pending: 0, provisioning: true })
      }
      throw pErr
    }

    if (!program) {
      return NextResponse.json({ program: null, rewards: [], pending: 0 })
    }

    // Self-heal legacy ratios — reflect the corrected value in the response.
    if (Number(program.points_per_tnd) !== 1) {
      await supabase.from('loyalty_programs').update({ points_per_tnd: 1 }).eq('business_id', business.id)
      program.points_per_tnd = 1
    }

    const now = new Date().toISOString()
    const [{ data: rewards }, pend] = await Promise.all([
      supabase.from('loyalty_rewards').select('*').eq('business_id', business.id).order('points_cost'),
      supabase
        .from('loyalty_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'pending')
        .gt('expires_at', now),
    ])

    return NextResponse.json({
      program: { redeem_expiry_hours: 48, ...program },
      rewards: rewards || [],
      pending: pend?.count ?? 0,
    })
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    if (isProvisioningError(e)) {
      return NextResponse.json({ program: null, rewards: [], pending: 0, provisioning: true })
    }
    console.error('admin/loyalty GET:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
})

/**
 * POST { action, ... } — all loyalty WRITES, scoped to the active business.
 *   { action: 'createProgram' }
 *   { action: 'updateProgram', patch: { active?, welcome_points?, redeem_expiry_hours? } }
 *   { action: 'addReward' }
 *   { action: 'updateReward', id, patch: { label?, points_cost?, active?, image_url? } }
 *   { action: 'deleteReward', id }
 */
export const POST = withStaff('loyalty.manage', async (request, { business }) => {
  try {
    const supabase: any = await createServiceRoleClient()
    const body = await request.json().catch(() => ({}))
    const action = body.action

    // A reward id is only touched if it belongs to THIS business.
    const ownReward = async (id: string) => {
      if (!id) return false
      const { data } = await supabase
        .from('loyalty_rewards')
        .select('id')
        .eq('id', id)
        .eq('business_id', business.id)
        .maybeSingle()
      return !!data
    }

    if (action === 'createProgram') {
      const { error: pErr } = await supabase
        .from('loyalty_programs')
        .insert({ business_id: business.id, active: false })
      if (pErr) {
        if (isProvisioningError(pErr)) return NextResponse.json({ error: 'PROVISION', provisioning: true })
        throw pErr
      }
      const rows = DEFAULT_REWARDS.map((r) => ({ business_id: business.id, label: r.label, points_cost: r.points_cost }))
      const { error: rErr } = await supabase.from('loyalty_rewards').insert(rows)
      if (rErr && !isProvisioningError(rErr)) throw rErr
      return NextResponse.json({ ok: true })
    }

    if (action === 'updateProgram') {
      const patch: Record<string, any> = {}
      const src = body.patch && typeof body.patch === 'object' ? body.patch : {}
      if ('active' in src) patch.active = !!src.active
      if ('welcome_points' in src) patch.welcome_points = Math.max(0, Math.round(Number(src.welcome_points) || 0))
      if ('redeem_expiry_hours' in src) {
        const h = Math.round(Number(src.redeem_expiry_hours) || 0)
        if (h > 0) patch.redeem_expiry_hours = h
      }
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
      const { error } = await supabase.from('loyalty_programs').update(patch).eq('business_id', business.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'addReward') {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .insert({ business_id: business.id, label: 'Nouvelle récompense', points_cost: 100 })
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, reward: data })
    }

    if (action === 'updateReward') {
      const id = String(body.id || '')
      if (!(await ownReward(id))) return NextResponse.json({ error: 'Récompense introuvable.' }, { status: 404 })
      const patch: Record<string, any> = {}
      const src = body.patch && typeof body.patch === 'object' ? body.patch : {}
      if ('label' in src) patch.label = String(src.label ?? '').trim().slice(0, 80)
      if ('points_cost' in src) patch.points_cost = Math.max(1, Math.round(Number(src.points_cost) || 1))
      if ('active' in src) patch.active = !!src.active
      if ('image_url' in src) patch.image_url = src.image_url == null ? null : String(src.image_url)
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
      const { error } = await supabase
        .from('loyalty_rewards')
        .update(patch)
        .eq('id', id)
        .eq('business_id', business.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'deleteReward') {
      const id = String(body.id || '')
      if (!(await ownReward(id))) return NextResponse.json({ error: 'Récompense introuvable.' }, { status: 404 })
      const { error } = await supabase
        .from('loyalty_rewards')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    if (isProvisioningError(e)) return NextResponse.json({ error: 'PROVISION', provisioning: true })
    console.error('admin/loyalty POST:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
})
