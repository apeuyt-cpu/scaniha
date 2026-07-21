import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { DEFAULT_PRIZES } from '@/lib/game'
import { newQrKey } from '@/lib/qr-session'

/**
 * GET → the owner's roulette game (full row) + prizes + today's stats (+ slug).
 * Read server-side with the service role because the game tables are RLS-gated:
 * a super-admin impersonating an owner (or staff) can't see the owner's rows via
 * their own browser session, which used to make the UI think no game existed and
 * then try to re-create it (→ UNIQUE(business_id,type) violation → "Erreur serveur.").
 * Used by useRoueGame (config screens) and, for slug/config.qrGate only, by the
 * QR-gate admin panel and the Partage page — adding fields is backward-compatible.
 * page.fidelite (every staff who can see Partage also has Fidélité in presets).
 */
export const GET = withStaff('page.fidelite', async (_req, { business }) => {
  const supabase: any = await createServiceRoleClient()
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('business_id', business.id)
    .eq('type', 'roulette')
    .order('created_at', { ascending: true })
    .limit(1)
  const game = data?.[0] || null

  let prizes: any[] = []
  let stats = { plays: 0, pending: 0, redeemed: 0 }
  if (game) {
    const midnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    const now = new Date().toISOString()
    const [{ data: p }, playsR, pendingR, redeemedR] = await Promise.all([
      supabase.from('prizes').select('*').eq('game_id', game.id).order('position').order('created_at'),
      supabase.from('plays').select('id', { count: 'exact', head: true }).eq('game_id', game.id).gte('created_at', midnight),
      supabase.from('wins').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'pending').gt('expires_at', now),
      supabase.from('wins').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'redeemed').gte('redeemed_at', midnight),
    ])
    prizes = p || []
    stats = { plays: playsR.count ?? 0, pending: pendingR.count ?? 0, redeemed: redeemedR.count ?? 0 }
  }

  return NextResponse.json({
    slug: business.slug,
    gameId: game?.id || null,
    config: game?.config || {},
    game,
    prizes,
    stats,
  })
})

/**
 * Owner game (roulette) setup — server-side CRUD so saving never depends on the
 * browser's Supabase token (the game tables are the only RLS-gated ones, so a
 * stale client session silently blocked writes → "Impossible d'enregistrer").
 * Here requireOwner re-authenticates from the cookie (auto-refreshing) and the
 * service-role client performs the write, scoped to the owner's own business.
 *
 *   { action: 'createGame' }
 *   { action: 'updateGame', gameId, patch }
 *   { action: 'addPrize', gameId, position }
 *   { action: 'updatePrize', prizeId, patch }
 *   { action: 'deletePrize', prizeId }
 */
const GAME_FIELDS = ['active', 'daily_limit', 'win_expiry_hours', 'config'] as const
const PRIZE_FIELDS = ['label', 'weight', 'cost', 'stock', 'active', 'position'] as const

function pick(obj: any, fields: readonly string[]) {
  const out: Record<string, any> = {}
  if (obj && typeof obj === 'object') for (const f of fields) if (f in obj) out[f] = obj[f]
  return out
}

export const POST = withStaff('loyalty.manage', async (request, { business }) => {
  try {
    const supabase: any = await createServiceRoleClient()
    const body = await request.json().catch(() => ({}))
    const action = body.action

    // Ownership guards — a game/prize id is only touched if it belongs here.
    const ownGame = async (gameId: string) => {
      if (!gameId) return null
      const { data } = await supabase.from('games').select('id, business_id').eq('id', gameId).maybeSingle()
      return data && data.business_id === business.id ? data : null
    }
    const ownPrize = async (prizeId: string) => {
      if (!prizeId) return null
      const { data } = await supabase.from('prizes').select('id, game_id').eq('id', prizeId).maybeSingle()
      if (!data) return null
      return (await ownGame(data.game_id)) ? data : null
    }

    if (action === 'createGame') {
      // Idempotent: if a roulette game already exists for this business, return it
      // instead of hitting the UNIQUE(business_id, type) constraint. The caller may
      // not have seen it (RLS-gated browser read while impersonating / as staff).
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('business_id', business.id)
        .eq('type', 'roulette')
        .maybeSingle()
      if (existing) return NextResponse.json({ ok: true, gameId: existing.id })

      const { data: g, error: gErr } = await supabase
        .from('games')
        .insert({ business_id: business.id, type: 'roulette', active: false })
        .select('*')
        .single()
      if (gErr) throw gErr
      const rows = DEFAULT_PRIZES.map((p, i) => ({ game_id: g.id, label: p.label, weight: p.weight, cost: p.cost, position: i }))
      const { error: pErr } = await supabase.from('prizes').insert(rows)
      if (pErr) throw pErr
      return NextResponse.json({ ok: true })
    }

    if (action === 'updateGame') {
      if (!(await ownGame(String(body.gameId || '')))) return NextResponse.json({ error: 'Jeu introuvable.' }, { status: 404 })
      const { error } = await supabase.from('games').update(pick(body.patch, GAME_FIELDS)).eq('id', body.gameId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'addPrize') {
      if (!(await ownGame(String(body.gameId || '')))) return NextResponse.json({ error: 'Jeu introuvable.' }, { status: 404 })
      const { data, error } = await supabase
        .from('prizes')
        .insert({ game_id: body.gameId, label: 'Nouveau lot', weight: 1, position: Number(body.position) || 0 })
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, prize: data })
    }

    if (action === 'updatePrize') {
      if (!(await ownPrize(String(body.prizeId || '')))) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 })
      const { error } = await supabase.from('prizes').update(pick(body.patch, PRIZE_FIELDS)).eq('id', body.prizeId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'deletePrize') {
      if (!(await ownPrize(String(body.prizeId || '')))) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 })
      const { error } = await supabase.from('prizes').delete().eq('id', body.prizeId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Rotate the QR-gate secret server-side (crypto-strong) — instantly
    // invalidates every outstanding scan cookie for this café.
    if (action === 'regenQrKey') {
      if (!(await ownGame(String(body.gameId || '')))) return NextResponse.json({ error: 'Jeu introuvable.' }, { status: 404 })
      const { data: cur } = await supabase.from('games').select('config').eq('id', body.gameId).maybeSingle()
      const config = cur?.config && typeof cur.config === 'object' ? cur.config : {}
      const prevGate = config.qrGate && typeof config.qrGate === 'object' ? config.qrGate : {}
      const qrKey = newQrKey()
      const nextConfig = { ...config, qrGate: { ...prevGate, qrKey } }
      const { error } = await supabase.from('games').update({ config: nextConfig }).eq('id', body.gameId)
      if (error) throw error
      return NextResponse.json({ ok: true, qrKey, config: nextConfig })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    console.error('admin/game route:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
})
