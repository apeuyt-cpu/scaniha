import { NextRequest, NextResponse } from 'next/server'
import { loadGameConfig, playGame, loadQrGate, playLimitBlocked } from '@/lib/db/game'
import { dinerSession } from '@/lib/db/account'
import { scanCookieName, verifyScan } from '@/lib/qr-session'
import { createServiceRoleClient } from '@/lib/supabase/server'

const ERR: Record<string, { status: number; msg: string }> = {
  no_business: { status: 404, msg: 'Etablissement introuvable.' },
  no_game: { status: 404, msg: 'Aucun jeu actif ici pour le moment.' },
  no_prizes: { status: 409, msg: 'Plus de lots disponibles pour le moment.' },
  device_limit: { status: 429, msg: 'Cet appareil a deja joue -- revenez bientot pour rejouer !' },
  phone_limit: { status: 429, msg: 'Ce numero a deja joue -- revenez bientot pour rejouer !' },
  setup: { status: 503, msg: 'Le jeu est en cours de configuration.' },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cfg = await loadGameConfig(slug)
  return NextResponse.json(cfg)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const gameMode = typeof body.gameMode === 'string' ? body.gameMode : 'roulette'

  const session = await dinerSession(typeof body.token === 'string' ? body.token : null)
  if (!session.ok) {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour jouer.', authRequired: true }, { status: 401 })
  }

  const loaded = await loadQrGate(slug)
  if (!loaded) {
    return NextResponse.json({ success: false, error: ERR.no_business.msg }, { status: 404 })
  }

  const phone = session.phone
  const deviceId: string | null = typeof body.deviceId === 'string' && body.deviceId ? body.deviceId.slice(0, 64) : null
  if (!deviceId) {
    return NextResponse.json({ success: false, error: 'Appareil non identifie.' }, { status: 400 })
  }

  if (loaded.gate.enabled && loaded.gate.qrKey) {
    const cookie = req.cookies.get(scanCookieName(loaded.businessId))?.value
    if (!verifyScan(cookie, loaded.businessId, loaded.gate.qrKey, loaded.gate.ttlMin)) {
      return NextResponse.json(
        { success: false, rescanRequired: true, error: loaded.gate.message.trim() || 'Scannez le QR du restaurant pour jouer.' },
        { status: 403 }
      )
    }
  }

  const limited = await playLimitBlocked(slug, deviceId, phone)
  if (limited) {
    const e = ERR[limited.reason]
    return NextResponse.json({ success: false, error: e.msg, nextPlayAt: limited.nextPlayAt }, { status: e.status })
  }

  if (gameMode === 'slot777') {
    const cfg = await loadGameConfig(slug)
    if (cfg.slotEnabled) {
      const slotCost = cfg.slotPointCost ?? 10
      const sb: any = await createServiceRoleClient()

      const { data: biz } = await sb
        .from('businesses').select('id').eq('slug', slug).maybeSingle()

      if (!biz) {
        return NextResponse.json({ success: false, error: ERR.no_business.msg }, { status: 404 })
      }

      const { data: ledger } = await sb
        .from('points_ledger')
        .select('delta')
        .eq('business_id', biz.id)
        .eq('customer_phone', phone)

      const currentBalance: number = Array.isArray(ledger)
        ? ledger.reduce((sum: number, row: any) => sum + (row.delta ?? 0), 0)
        : 0

      if (currentBalance < slotCost) {
        return NextResponse.json(
          { success: false, error: `Points insuffisants -- il vous faut ${slotCost} pts pour jouer au Slot 777.` },
          { status: 402 }
        )
      }

      const { error: ledgerErr } = await sb.from('points_ledger').insert({
        business_id: biz.id,
        customer_phone: phone,
        delta: -slotCost,
        reason: 'play',
        note: 'Partie de Slot Machine 777',
      })

      if (ledgerErr) {
        console.error('slot ledger deduct error:', ledgerErr.message)
        return NextResponse.json({ success: false, error: 'Erreur lors de la deduction des points.' }, { status: 500 })
      }
    }
  }

  const result = await playGame(slug, deviceId, phone)
  if (!result.ok) {
    const e = ERR[result.error] || { status: 500, msg: 'Le jeu est momentanement indisponible.' }
    return NextResponse.json({ success: false, error: e.msg, nextPlayAt: result.nextPlayAt ?? null }, { status: e.status })
  }

  // Check if the won prize is a "perte" (lose) prize — suppress ticket code
  const gameCfg = await loadGameConfig(slug)
  const isLosePrize = Boolean(gameCfg.prizeIsLose?.[result.prizeIndex ?? -1])

  return NextResponse.json({
    success: true,
    prizeIndex: result.prizeIndex,
    prizeLabel: result.prizeLabel,
    isLose: isLosePrize,
    // No code or expiry for a losing spin — player lost, no ticket needed
    code: isLosePrize ? null : result.code,
    expiresAt: isLosePrize ? null : result.expiresAt,
    pointsEarned: result.pointsEarned,
    balance: result.balance,
    nextPlayAt: result.nextPlayAt ?? null,
  })
}