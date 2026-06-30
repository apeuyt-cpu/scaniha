import { NextRequest, NextResponse } from 'next/server'
import { loadLoyalty, redeemReward, normPhone } from '@/lib/db/loyalty'
import { loadQrGate } from '@/lib/db/game'
import { dinerSession } from '@/lib/db/account'
import { scanCookieName, verifyScan } from '@/lib/qr-session'
import { checkRateLimit } from '@/lib/api/rate-limit'

/**
 * Public loyalty endpoints (by business slug).
 *   GET ?phone=…           → { active, businessName, accent, pointsPerTnd, rewards, summary }
 *                            (summary = balance + history + active codes when a phone is given)
 *   POST {phone, rewardId} → redeem atomically via the `redeem_reward` RPC → { success, code, … }
 */

const ERR: Record<string, { status: number; msg: string }> = {
  no_business: { status: 404, msg: 'Établissement introuvable.' },
  no_program: { status: 404, msg: 'Programme de fidélité indisponible.' },
  no_reward: { status: 404, msg: 'Récompense introuvable.' },
  setup: { status: 503, msg: 'Le programme est en cours de configuration.' },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Per-IP throttle to blunt phone enumeration (best-effort, in-process — no new infra).
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const rl = checkRateLimit('loyalty-get:' + ip)
  if (!rl.ok) {
    return NextResponse.json(
      { active: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  // SECURITY (IDOR): the summary (balance + history + live claimable codes) is
  // private. Only return it for ?phone= when a valid diner session (?token=)
  // resolves to THAT phone. A missing/mismatched token isn't fatal: fall back to
  // the public config (summary=null) so the rewards list still loads for
  // logged-out browsing — but never leak a stranger's account by phone alone.
  const phone = req.nextUrl.searchParams.get('phone')
  const normedPhone = normPhone(phone)
  let phoneForLoad: string | null = null
  if (normedPhone) {
    const session = await dinerSession(req.nextUrl.searchParams.get('token'))
    if (session.ok && session.phone === normedPhone) phoneForLoad = normedPhone
  }

  const cfg = await loadLoyalty(slug, phoneForLoad)
  return NextResponse.json(cfg)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))

  const phone = normPhone(body.phone)
  const rewardId = typeof body.rewardId === 'string' ? body.rewardId : null
  if (!phone || !rewardId) {
    return NextResponse.json({ success: false, error: 'Numéro ou récompense manquant.' }, { status: 400 })
  }

  // SECURITY: the requester must hold a valid diner session whose phone matches.
  // The phone is derived from the token server-side (never trust client.phone) —
  // without it anyone could POST {phone, rewardId} and drain a stranger's points.
  // Identity is GLOBAL so the token isn't café-bound, but redeem_reward is scoped
  // to THIS café by slug + that phone, so a global token can only ever spend its
  // OWN balance at this café.
  const session = await dinerSession(typeof body.token === 'string' ? body.token : null)
  if (!session.ok || session.phone !== phone) {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour échanger vos points.' }, { status: 401 })
  }

  // QR-session gate — only when the owner opted to also lock redemptions.
  const loaded = await loadQrGate(slug)
  if (loaded && loaded.gate.enabled && loaded.gate.qrKey && loaded.gate.alsoRedeem) {
    const cookie = req.cookies.get(scanCookieName(loaded.businessId))?.value
    if (!verifyScan(cookie, loaded.businessId, loaded.gate.qrKey, loaded.gate.ttlMin)) {
      return NextResponse.json(
        { success: false, rescanRequired: true, error: loaded.gate.message.trim() || 'Scannez le QR du restaurant pour échanger.' },
        { status: 403 }
      )
    }
  }

  const result = await redeemReward(slug, phone, rewardId)
  if (!result.ok) {
    if (result.error === 'insufficient') {
      return NextResponse.json(
        { success: false, error: `Il vous manque ${result.missing ?? 0} points pour cette récompense.` },
        { status: 409 }
      )
    }
    const e = ERR[result.error] || { status: 500, msg: 'Échange momentanément indisponible.' }
    return NextResponse.json({ success: false, error: e.msg }, { status: e.status })
  }

  return NextResponse.json({
    success: true,
    code: result.code,
    rewardLabel: result.rewardLabel,
    expiresAt: result.expiresAt,
    balance: result.balance,
  })
}
