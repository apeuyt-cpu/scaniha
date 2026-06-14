import { NextRequest, NextResponse } from 'next/server'
import { loadLoyalty, redeemReward, normPhone } from '@/lib/db/loyalty'

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
  const cfg = await loadLoyalty(slug, req.nextUrl.searchParams.get('phone'))
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
