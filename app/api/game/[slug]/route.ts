import { NextRequest, NextResponse } from 'next/server'
import { loadGameConfig, playGame, loadQrGate } from '@/lib/db/game'
import { dinerSession } from '@/lib/db/account'
import { scanCookieName, verifyScan } from '@/lib/qr-session'

/**
 * Public game endpoints for a business (by slug).
 *   GET  → { active, loyaltyActive, businessName, prizes:[labels], accent }
 *   POST → spin: the whole draw runs atomically in the `play_game` RPC →
 *          { success, prizeIndex, prizeLabel, code, expiresAt, pointsEarned, balance }
 *
 * Phone is required (every play is tied to a customer and earns points). The
 * draw is server-side; daily limit + stock + win code are enforced in one
 * transaction inside Postgres, so there are no client-side races.
 */

const ERR: Record<string, { status: number; msg: string }> = {
  no_business: { status: 404, msg: 'Établissement introuvable.' },
  no_game: { status: 404, msg: 'Aucun jeu actif ici pour le moment.' },
  no_prizes: { status: 409, msg: 'Plus de lots disponibles aujourd’hui.' },
  device_limit: { status: 429, msg: 'Vous avez déjà joué aujourd’hui — revenez demain !' },
  phone_limit: { status: 429, msg: 'Ce numéro a déjà joué aujourd’hui — revenez demain !' },
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

  // Login required: the spin is tied to a diner account (phone derived from the
  // session token, never trusted from the client).
  const session = await dinerSession(typeof body.token === 'string' ? body.token : null)
  if (!session.ok) {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour jouer.', authRequired: true }, { status: 401 })
  }

  // Pin the token to THIS café. A diner session is issued per business, so a
  // café-A token must never be replayable against café B's slug — that would
  // record a play, credit café B's points and burn its daily limit under a phone
  // that never created a café-B account. Resolve the slug's business once (also
  // reused by the QR gate below) and reject any mismatch.
  const loaded = await loadQrGate(slug)
  if (!loaded) {
    return NextResponse.json({ success: false, error: ERR.no_business.msg }, { status: 404 })
  }
  if (session.businessId && loaded.businessId !== session.businessId) {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour jouer.', authRequired: true }, { status: 401 })
  }

  const phone = session.phone
  const deviceId: string | null = typeof body.deviceId === 'string' && body.deviceId ? body.deviceId.slice(0, 64) : null
  if (!deviceId) {
    return NextResponse.json({ success: false, error: 'Appareil non identifié.' }, { status: 400 })
  }

  // QR-session gate: only let diners who scanned the café's CURRENT QR recently
  // spin. The signed scan cookie is minted by /api/game/[slug]/scan; here we just
  // verify it against the current key + TTL. Expired/missing → "rescan".
  if (loaded.gate.enabled && loaded.gate.qrKey) {
    const cookie = req.cookies.get(scanCookieName(loaded.businessId))?.value
    if (!verifyScan(cookie, loaded.businessId, loaded.gate.qrKey, loaded.gate.ttlMin)) {
      return NextResponse.json(
        { success: false, rescanRequired: true, error: loaded.gate.message.trim() || 'Scannez le QR du restaurant pour jouer.' },
        { status: 403 }
      )
    }
  }

  const result = await playGame(slug, deviceId, phone)
  if (!result.ok) {
    const e = ERR[result.error] || { status: 500, msg: 'Le jeu est momentanément indisponible.' }
    return NextResponse.json({ success: false, error: e.msg }, { status: e.status })
  }

  return NextResponse.json({
    success: true,
    prizeIndex: result.prizeIndex,
    prizeLabel: result.prizeLabel,
    code: result.code,
    expiresAt: result.expiresAt,
    pointsEarned: result.pointsEarned,
    balance: result.balance,
  })
}
