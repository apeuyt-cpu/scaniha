import { NextRequest, NextResponse } from 'next/server'
import { loadGameConfig, playGame, loadQrGate, playLimitBlocked } from '@/lib/db/game'
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
  no_prizes: { status: 409, msg: 'Plus de lots disponibles pour le moment.' },
  device_limit: { status: 429, msg: 'Cet appareil a déjà joué — revenez bientôt pour rejouer !' },
  phone_limit: { status: 429, msg: 'Ce numéro a déjà joué — revenez bientôt pour rejouer !' },
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

  // SECURITY: identity is GLOBAL, so the token isn't café-bound — but the phone is
  // derived from it server-side (never trust client.phone). The play is scoped to
  // THIS café by the slug; play_game writes to the right café's data for that phone.
  // A global token replayed at café B can therefore only ever touch café B's rows
  // for its OWN phone — never another phone, never another café's totals.
  const loaded = await loadQrGate(slug)
  if (!loaded) {
    return NextResponse.json({ success: false, error: ERR.no_business.msg }, { status: 404 })
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

  // Rolling-cooldown limit guard in Node — also blocks if the deployed play_game
  // RPC is outdated (the usual reason a diner "can still spin a lot"). The RPC
  // remains the authoritative, race-safe check. nextPlayAt drives the countdown.
  const limited = await playLimitBlocked(slug, deviceId, phone)
  if (limited) {
    const e = ERR[limited.reason]
    return NextResponse.json({ success: false, error: e.msg, nextPlayAt: limited.nextPlayAt }, { status: e.status })
  }

  const result = await playGame(slug, deviceId, phone)
  if (!result.ok) {
    const e = ERR[result.error] || { status: 500, msg: 'Le jeu est momentanément indisponible.' }
    return NextResponse.json({ success: false, error: e.msg, nextPlayAt: result.nextPlayAt ?? null }, { status: e.status })
  }

  return NextResponse.json({
    success: true,
    prizeIndex: result.prizeIndex,
    prizeLabel: result.prizeLabel,
    code: result.code,
    expiresAt: result.expiresAt,
    pointsEarned: result.pointsEarned,
    balance: result.balance,
    nextPlayAt: result.nextPlayAt ?? null,
  })
}
