import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { loadQrGate } from '@/lib/db/game'
import { scanCookieName, verifyScan } from '@/lib/qr-session'
import { checkRateLimit } from '@/lib/api/rate-limit'

export const runtime = 'nodejs'

/**
 * A player submits inline-survey answers for a survey gate (before login).
 * Body: { gateId, deviceId, answers: [{ question, answer }] }
 * Stored in game_survey_responses for the owner to read.
 *
 * SECURITY: this is a public, pre-login endpoint that writes with the
 * service-role key, so it is abuse-hardened three ways:
 *  - QR-gate: when the café enables the scan gate, a valid (non-expired) scan
 *    cookie for the CURRENT qrKey is required (mirrors the spin route) → 403.
 *  - Rate limit: per-IP + per-device sliding window (in-process, free-tier) → 429.
 *  - Dedup: insert ignores conflicts on (business_id, gate_id, device_id) so a
 *    device can only answer a given survey once (DB unique index, see sqlNeeded).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const gateId = typeof body.gateId === 'string' ? body.gateId.slice(0, 64) : ''
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : null
  const rawAnswers = Array.isArray(body.answers) ? body.answers : []
  if (!gateId) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })

  // Rate limit: throttle floods per IP (and per device) before any DB work.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const limit = checkRateLimit('survey:' + ip + ':' + slug)
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  if (deviceId) {
    const devLimit = checkRateLimit('survey:dev:' + deviceId + ':' + slug)
    if (!devLimit.ok) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }
  }

  const answers = rawAnswers.slice(0, 20).map((a: any) => ({
    question: String(a?.question ?? '').slice(0, 300),
    answer: String(a?.answer ?? '').slice(0, 1000),
  }))

  try {
    const loaded = await loadQrGate(slug)
    if (!loaded) return NextResponse.json({ ok: false, error: 'no_business' }, { status: 404 })

    // QR-session gate: when enabled, only diners who scanned the café's CURRENT
    // QR recently may submit. Mirrors the spin route — the signed scan cookie is
    // minted by /api/game/[slug]/scan; here we just verify it. Missing/expired → 403.
    if (loaded.gate.enabled && loaded.gate.qrKey) {
      const cookie = req.cookies.get(scanCookieName(loaded.businessId))?.value
      if (!verifyScan(cookie, loaded.businessId, loaded.gate.qrKey, loaded.gate.ttlMin)) {
        return NextResponse.json({ ok: false, error: 'rescan_required' }, { status: 403 })
      }
    }

    const supabase: any = await createServiceRoleClient()
    // One response per device per survey: ignore duplicates on the unique index
    // (business_id, gate_id, device_id). Returns ok either way.
    const { error } = await supabase
      .from('game_survey_responses')
      .upsert(
        { business_id: loaded.businessId, gate_id: gateId, device_id: deviceId, answers },
        { onConflict: 'business_id,gate_id,device_id', ignoreDuplicates: true }
      )
    if (error) {
      console.error('survey insert:', error.message)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('survey route:', e?.message)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
