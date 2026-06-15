import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { normalizeQrGate } from '@/lib/db/game'
import { newQrKey } from '@/lib/qr-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Super-admin control for a café's "scan the QR to play" gate (games.config.qrGate).
 * Lets the platform owner enable/disable the gate, set the scan-session validity
 * (e.g. 10 min) and rotate the QR key — per café, from the businesses dashboard.
 *
 *   GET   → { exists, gameActive, enabled, ttlMin, hasKey }   (no key leaked)
 *   PATCH → body { enabled?, ttlMin?, regen?, message?, alsoRedeem? }
 *
 * The gate only enforces while the roulette game is active; enabling/regenerating
 * mints a fresh key, so the café must REPRINT its QR (Partage) or on-site diners
 * can't pass the gate — the UI warns about this.
 */
function guard(e: any): NextResponse | null {
  if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
  return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
}

async function loadRouletteGame(supabase: any, businessId: string) {
  const { data } = await supabase
    .from('games')
    .select('id, config, active')
    .eq('business_id', businessId)
    .eq('type', 'roulette')
    .order('created_at', { ascending: true })
    .limit(1)
  return data?.[0] || null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }

  const supabase: any = await createServiceRoleClient()
  const game = await loadRouletteGame(supabase, id)
  if (!game) return NextResponse.json({ exists: false })

  const gate = normalizeQrGate((game.config as any)?.qrGate)
  return NextResponse.json({
    exists: true,
    gameActive: Boolean(game.active),
    enabled: gate.enabled,
    ttlMin: gate.ttlMin,
    hasKey: gate.qrKey.length > 0,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }

  const body = await req.json().catch(() => ({}))
  const supabase: any = await createServiceRoleClient()
  const game = await loadRouletteGame(supabase, id)
  if (!game) {
    return NextResponse.json({ error: 'Ce café n’a pas encore configuré la roue.' }, { status: 409 })
  }

  const config = game.config && typeof game.config === 'object' ? game.config : {}
  const next = normalizeQrGate(config.qrGate)

  if (typeof body.enabled === 'boolean') next.enabled = body.enabled
  if (body.ttlMin != null) {
    const t = Number(body.ttlMin)
    if (Number.isFinite(t) && t > 0) next.ttlMin = Math.min(1440, Math.round(t))
  }
  if (typeof body.message === 'string') next.message = body.message
  if (typeof body.alsoRedeem === 'boolean') next.alsoRedeem = body.alsoRedeem

  // Mint a key when explicitly regenerating, or when turning the gate on without
  // one — the gate does nothing unless a key is embedded in the café's QR.
  if (body.regen === true || (next.enabled && !next.qrKey)) {
    next.qrKey = newQrKey()
  }

  const nextConfig = { ...config, qrGate: next }
  const { error } = await supabase.from('games').update({ config: nextConfig }).eq('id', game.id)
  if (error) {
    console.error('super-admin qr-gate:', error.message)
    return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    exists: true,
    gameActive: Boolean(game.active),
    enabled: next.enabled,
    ttlMin: next.ttlMin,
    hasKey: next.qrKey.length > 0,
  })
}
