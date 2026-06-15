import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Super-admin ACTIVITY + data management. Platform-wide view of everything diners
 * and cafés are doing (plays, wins, reward redemptions, points, new accounts),
 * plus full data management (delete records, cancel a win, adjust points).
 *
 * Auth: super-admin only. All reads/writes use the service role (the route is the
 * auth boundary), so RLS is bypassed intentionally — never expose this publicly.
 *
 *   GET  → { stats, feed, businesses }
 *   POST → { action: 'delete'|'cancelWin'|'adjustPoints', ... }
 */

const DELETABLE = new Set(['plays', 'wins', 'loyalty_redemptions', 'points_ledger', 'diner_accounts'])

async function guard() {
  try {
    await requireSuperAdmin()
    return null
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}

export async function GET() {
  const denied = await guard()
  if (denied) return denied

  const sb: any = await createServiceRoleClient()
  const now = Date.now()
  const dayAgo = new Date(now - 86_400_000).toISOString()
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString()

  const count = async (table: string, build?: (q: any) => any) => {
    let q = sb.from(table).select('id', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count: c } = await q
    return c || 0
  }

  // Café name lookup
  const { data: bizRows } = await sb.from('businesses').select('id, name, slug').order('name')
  const businesses = (bizRows || []) as { id: string; name: string; slug: string }[]
  const nameOf = (id: string) => businesses.find((b) => b.id === id)?.name || '—'

  // Platform stats (counts are cheap; sums avoided to stay fast on the free tier)
  const [
    playsTotal, playsToday, playsWeek,
    winsPending, winsRedeemed, redemptionsTotal, dinersTotal, dinersWeek,
  ] = await Promise.all([
    count('plays'),
    count('plays', (q: any) => q.gte('created_at', dayAgo)),
    count('plays', (q: any) => q.gte('created_at', weekAgo)),
    count('wins', (q: any) => q.eq('status', 'pending')),
    count('wins', (q: any) => q.eq('status', 'redeemed')),
    count('loyalty_redemptions'),
    count('diner_accounts'),
    count('diner_accounts', (q: any) => q.gte('created_at', weekAgo)),
  ])

  const stats = {
    playsTotal, playsToday, playsWeek,
    winsPending, winsRedeemed,
    redemptionsTotal, dinersTotal, dinersWeek,
  }

  // Recent events from each table → normalize → merge → newest first
  const LIM = 40
  const [plays, wins, reds, ledger, accts] = await Promise.all([
    sb.from('plays').select('id, business_id, customer_phone, created_at').order('created_at', { ascending: false }).limit(LIM),
    sb.from('wins').select('id, business_id, customer_phone, prize_label, code, status, created_at').order('created_at', { ascending: false }).limit(LIM),
    sb.from('loyalty_redemptions').select('id, business_id, customer_phone, reward_label, points_cost, code, status, created_at').order('created_at', { ascending: false }).limit(LIM),
    sb.from('points_ledger').select('id, business_id, customer_phone, delta, reason, note, created_at').order('created_at', { ascending: false }).limit(LIM),
    sb.from('diner_accounts').select('id, business_id, phone, name, created_at').order('created_at', { ascending: false }).limit(LIM),
  ])

  type Ev = {
    key: string; type: string; table: string; id: string
    businessId: string; businessName: string; phone: string | null
    label: string; sub?: string; status?: string; created_at: string
  }
  const feed: Ev[] = []
  for (const p of plays.data || []) feed.push({ key: 'play-' + p.id, type: 'play', table: 'plays', id: p.id, businessId: p.business_id, businessName: nameOf(p.business_id), phone: p.customer_phone, label: 'A joué à la roue', created_at: p.created_at })
  for (const w of wins.data || []) feed.push({ key: 'win-' + w.id, type: 'win', table: 'wins', id: w.id, businessId: w.business_id, businessName: nameOf(w.business_id), phone: w.customer_phone, label: 'A gagné : ' + w.prize_label, sub: w.code, status: w.status, created_at: w.created_at })
  for (const r of reds.data || []) feed.push({ key: 'red-' + r.id, type: 'redeem', table: 'loyalty_redemptions', id: r.id, businessId: r.business_id, businessName: nameOf(r.business_id), phone: r.customer_phone, label: 'A échangé : ' + r.reward_label, sub: `${r.points_cost} pts · ${r.code}`, status: r.status, created_at: r.created_at })
  for (const l of ledger.data || []) feed.push({ key: 'pts-' + l.id, type: 'points', table: 'points_ledger', id: l.id, businessId: l.business_id, businessName: nameOf(l.business_id), phone: l.customer_phone, label: `${l.delta > 0 ? '+' : ''}${l.delta} points (${l.reason})`, sub: l.note || undefined, created_at: l.created_at })
  for (const a of accts.data || []) feed.push({ key: 'acc-' + a.id, type: 'signup', table: 'diner_accounts', id: a.id, businessId: a.business_id, businessName: nameOf(a.business_id), phone: a.phone, label: 'Nouveau client' + (a.name ? ` : ${a.name}` : ''), created_at: a.created_at })

  feed.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())

  return NextResponse.json({ stats, feed: feed.slice(0, 80), businesses })
}

export async function POST(request: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  const sb: any = await createServiceRoleClient()
  const body = await request.json().catch(() => ({}))
  const action = body.action

  try {
    if (action === 'delete') {
      const table = String(body.table || '')
      const id = String(body.id || '')
      if (!DELETABLE.has(table) || !id) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'cancelWin') {
      const id = String(body.id || '')
      if (!id) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
      const { error } = await sb.from('wins').update({ status: 'expired' }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'adjustPoints') {
      const businessId = String(body.businessId || '')
      const phone = String(body.phone || '')
      const delta = Math.round(Number(body.delta))
      const note = typeof body.note === 'string' ? body.note.slice(0, 200) : 'Ajustement super-admin'
      if (!businessId || !phone || !Number.isFinite(delta) || delta === 0) {
        return NextResponse.json({ error: 'Renseignez le café, le téléphone et un nombre de points (≠ 0).' }, { status: 400 })
      }
      const { error } = await sb.from('points_ledger').insert({ business_id: businessId, customer_phone: phone, delta, reason: 'adjust', note })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    console.error('super-admin/activity:', e?.message)
    return NextResponse.json({ error: e?.message || 'Erreur serveur.' }, { status: 500 })
  }
}
