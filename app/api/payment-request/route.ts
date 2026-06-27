import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_PLANS, PAYMENT_METHODS, MAX_RECEIPTS, addonById } from '@/lib/payment-config'

// Receipts must be Supabase-storage URLs we just uploaded, never arbitrary
// external links (matches the design route's check).
const STORAGE_URL = /\/storage\/v1\/object\/public\//

export async function POST(req: NextRequest) {
  try {
    // Identify the logged-in user.
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { businessId, plan, method, receiptUrls, addons } = await req.json()

    // Validate input.
    if (!businessId || !PAYMENT_PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }
    if (!PAYMENT_METHODS.some((m) => m.id === method)) {
      return NextResponse.json({ error: 'Méthode de paiement invalide' }, { status: 400 })
    }
    if (!Array.isArray(receiptUrls) || receiptUrls.length < 1 || receiptUrls.length > MAX_RECEIPTS) {
      return NextResponse.json({ error: `Joignez entre 1 et ${MAX_RECEIPTS} reçus` }, { status: 400 })
    }
    if (!receiptUrls.every((u) => typeof u === 'string' && u.startsWith('https://') && STORAGE_URL.test(u))) {
      return NextResponse.json({ error: 'Reçus invalides' }, { status: 400 })
    }

    // Verify the business belongs to this user (service role bypasses RLS for the check).
    const admin = await createServiceRoleClient()
    const { data: business, error: bizErr } = await (admin.from('businesses') as any)
      .select('id, owner_id, name')
      .eq('id', businessId)
      .single()

    if (bizErr || !business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validate + price the physical add-ons SERVER-SIDE (never trust client totals).
    const addonLines: { id: string; label: string; qty: number; unit_price: number; total: number }[] = []
    if (Array.isArray(addons)) {
      for (const entry of addons) {
        const def = addonById(entry?.id)
        const qty = Math.floor(Number(entry?.qty))
        if (!def || !Number.isFinite(qty) || qty <= 0) continue
        const clamped = Math.min(def.max, qty)
        addonLines.push({ id: def.id, label: def.label, qty: clamped, unit_price: def.price, total: clamped * def.price })
      }
    }
    const addonsAmount = addonLines.reduce((s, l) => s + l.total, 0)

    const insertRow: Record<string, any> = {
      business_id: businessId,
      plan,
      method,
      full_name: business.name,
      amount: PAYMENT_PLANS[plan].price + addonsAmount,
      receipt_urls: receiptUrls,
      status: 'pending',
    }
    if (addonLines.length > 0) insertRow.addons = addonLines

    let { error: insertErr } = await (admin.from('payment_requests') as any).insert(insertRow)
    // Older DB without the addons column → retry without it (amount still includes them).
    if (insertErr && insertErr.message?.includes('addons')) {
      delete insertRow.addons
      ;({ error: insertErr } = await (admin.from('payment_requests') as any).insert(insertRow))
    }

    if (insertErr) {
      console.error('payment_request insert error:', insertErr.message)
      return NextResponse.json(
        { error: "Impossible d'enregistrer la demande. Réessayez plus tard." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('payment-request error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
