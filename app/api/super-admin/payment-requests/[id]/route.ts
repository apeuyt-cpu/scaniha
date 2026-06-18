import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_PLANS } from '@/lib/payment-config'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const body = await request.json()
    const { action } = body
    // The operator may explicitly acknowledge an amount mismatch to proceed anyway.
    const overrideMismatch = body?.overrideMismatch === true
    // A motive is required when forcing approval of a mismatched amount (audited).
    const overrideReason =
      typeof body?.amountOverrideReason === 'string' ? body.amountOverrideReason.trim().slice(0, 500) : ''

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { data: req, error: reqErr } = await (supabase.from('payment_requests') as any)
      .select('id, business_id, plan, status, amount, addons')
      .eq('id', id)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }
    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'Demande déjà traitée.' }, { status: 409 })
    }

    // Reviewer audit fields — written defensively. The columns (reviewed_by /
    // reviewed_at) may not exist yet; if the update rejects them we retry without.
    const reviewAudit = { reviewed_by: user.id, reviewed_at: new Date().toISOString() }
    const updateRequest = async (extra: Record<string, any>) => {
      const payload: Record<string, any> = { ...extra, ...reviewAudit }
      let { error } = await (supabase.from('payment_requests') as any).update(payload).eq('id', id)
      if (error && /reviewed_by|reviewed_at|amount_override_reason|column/i.test(error.message || '')) {
        // Retry without the audit columns if the schema doesn't have them. The
        // override reason rides in `extra`, so drop it here too.
        const { amount_override_reason: _omit, ...extraSafe } = extra
        const { error: error2 } = await (supabase.from('payment_requests') as any)
          .update(extraSafe)
          .eq('id', id)
        error = error2
      }
      return error
    }

    if (action === 'reject') {
      const error = await updateRequest({ status: 'rejected' })
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // ── Approve ──────────────────────────────────────────────────────────
    const planDef = PAYMENT_PLANS[req.plan]
    if (!planDef) {
      return NextResponse.json({ error: `Forfait inconnu : ${req.plan}` }, { status: 400 })
    }

    // Verify the submitted amount matches the expected price (plan + add-ons).
    // The add-ons were priced server-side at submission time, so we recompute
    // the expected total from the stored add-on lines.
    const addonsTotal = Array.isArray(req.addons)
      ? req.addons.reduce((s: number, a: any) => s + (Number(a?.total) || 0), 0)
      : 0
    const expectedAmount = planDef.price + addonsTotal
    const submittedAmount = req.amount === null || req.amount === undefined ? null : Number(req.amount)

    const amountMismatch =
      submittedAmount !== null && Math.abs(submittedAmount - expectedAmount) > 0.001

    if (amountMismatch && !overrideMismatch) {
      // Block by default — the operator must explicitly override after review.
      return NextResponse.json(
        {
          error:
            `Le montant déclaré (${submittedAmount} TND) ne correspond pas au prix attendu ` +
            `(${expectedAmount} TND). Vérifiez le reçu, puis confirmez pour forcer l’approbation.`,
          code: 'AMOUNT_MISMATCH',
          expectedAmount,
          submittedAmount,
        },
        { status: 409 }
      )
    }

    if (amountMismatch && overrideMismatch && !overrideReason) {
      return NextResponse.json(
        {
          error: "Un motif est requis pour forcer l'approbation d'un montant différent.",
          code: 'REASON_REQUIRED',
        },
        { status: 400 }
      )
    }

    // Activate the business and EXTEND its subscription by the plan duration.
    const days = planDef.grantsDays
    let expires_at: string | null = null
    if (days !== null) {
      const { data: biz } = await (supabase.from('businesses') as any)
        .select('expires_at, status')
        .eq('id', req.business_id)
        .single()
      // Renewals extend from the current expiry when it's still in the future.
      const now = new Date()
      const from =
        biz?.expires_at && new Date(biz.expires_at) > now ? new Date(biz.expires_at) : now
      from.setDate(from.getDate() + days)
      expires_at = from.toISOString()
    }

    const { error: bizErr } = await (supabase.from('businesses') as any)
      .update({ status: 'active', expires_at })
      .eq('id', req.business_id)
    if (bizErr) throw new Error(bizErr.message)

    const updErr = await updateRequest({
      status: 'approved',
      ...(amountMismatch && overrideMismatch ? { amount_override_reason: overrideReason } : {}),
    })
    if (updErr) throw new Error(updErr.message)

    if (amountMismatch && overrideMismatch) {
      console.warn(
        `[AUDIT] super-admin ${user.id} approved payment request ${id} with an amount ` +
          `mismatch (declared ${submittedAmount} TND vs expected ${expectedAmount} TND). ` +
          `Motif: ${overrideReason}`
      )
    }

    return NextResponse.json({ success: true, status: 'approved', expires_at })
  } catch (error: any) {
    // requireSuperAdmin() uses redirect(), which throws NEXT_REDIRECT — translate to 401 for this JSON API.
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('payment-request action error:', error)
    const unauthorized = error.message?.includes('Unauthorized') || error.message?.includes('auth')
    return NextResponse.json(
      { error: unauthorized ? 'Non autorisé.' : 'Erreur serveur.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
