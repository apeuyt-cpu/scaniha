'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StatCard from '@/components/admin/ui/StatCard'
import { Skeleton, CardSkeleton } from '@/components/admin/ui/Skeleton'
import { useToast } from '@/components/super-admin/Toast'

type Ev = {
  key: string; type: 'play' | 'win' | 'redeem' | 'points' | 'signup'
  table: string; id: string
  businessId: string; businessName: string; phone: string | null
  label: string; sub?: string; status?: string; created_at: string
}
type Biz = { id: string; name: string; slug: string }
type Data = {
  stats: { playsTotal: number; playsToday: number; playsWeek: number; winsPending: number; winsRedeemed: number; redemptionsTotal: number; dinersTotal: number; dinersWeek: number }
  feed: Ev[]
  businesses: Biz[]
}

const TYPE_META: Record<Ev['type'], { icon: string; label: string; chip: string }> = {
  play: { icon: '🎡', label: 'Parties', chip: 'bg-blue-50 text-blue-700 ring-blue-100' },
  win: { icon: '🎁', label: 'Gains', chip: 'bg-orange-50 text-orange-700 ring-orange-100' },
  redeem: { icon: '🎟️', label: 'Échanges', chip: 'bg-purple-50 text-purple-700 ring-purple-100' },
  points: { icon: '⭐', label: 'Points', chip: 'bg-amber-50 text-amber-700 ring-amber-100' },
  signup: { icon: '👤', label: 'Clients', chip: 'bg-green-50 text-green-700 ring-green-100' },
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `il y a ${s}s`
  const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24); if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ActivityDashboard() {
  const { toast } = useToast()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [bizFilter, setBizFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Ev['type']>('all')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Points-adjust tool
  const [adjBiz, setAdjBiz] = useState('')
  const [adjPhone, setAdjPhone] = useState('')
  const [adjDelta, setAdjDelta] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [adjBusy, setAdjBusy] = useState(false)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/super-admin/activity', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erreur de chargement.')
      setData(j)
    } catch (e: any) {
      setErr(e.message || 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const feed = useMemo(() => {
    if (!data) return []
    const qq = q.trim().toLowerCase()
    return data.feed.filter((ev) =>
      (typeFilter === 'all' || ev.type === typeFilter) &&
      (bizFilter === 'all' || ev.businessId === bizFilter) &&
      (!qq || (ev.phone || '').toLowerCase().includes(qq) || ev.businessName.toLowerCase().includes(qq) || ev.label.toLowerCase().includes(qq)),
    )
  }, [data, q, bizFilter, typeFilter])

  const post = async (payload: Record<string, unknown>, okMsg: string) => {
    const res = await fetch('/api/super-admin/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) throw new Error(j.error || 'Échec de l’opération.')
    toast(okMsg, 'success')
    await load()
  }

  const onDelete = async (ev: Ev) => {
    setBusyKey(ev.key)
    try { await post({ action: 'delete', table: ev.table, id: ev.id }, 'Enregistrement supprimé.') }
    catch (e: any) { toast(e.message, 'error') }
    finally { setBusyKey(null); setConfirming(null) }
  }
  const onCancelWin = async (ev: Ev) => {
    setBusyKey(ev.key)
    try { await post({ action: 'cancelWin', id: ev.id }, 'Gain annulé.') }
    catch (e: any) { toast(e.message, 'error') }
    finally { setBusyKey(null) }
  }
  const onAdjust = async () => {
    setAdjBusy(true)
    try {
      await post({ action: 'adjustPoints', businessId: adjBiz, phone: adjPhone.trim(), delta: Number(adjDelta), note: adjNote.trim() || undefined }, 'Points ajustés.')
      setAdjPhone(''); setAdjDelta(''); setAdjNote('')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setAdjBusy(false) }
  }

  if (loading) return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement de l’activité">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-2xl" />)}
      </div>
      <CardSkeleton rows={6} />
    </div>
  )
  if (err) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err} <button onClick={load} className="ml-2 font-semibold underline">Réessayer</button></div>
  if (!data) return null

  const s = data.stats
  const inputCls = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-200'

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Parties (total)" value={s.playsTotal} />
        <StatCard label="Parties aujourd’hui" value={s.playsToday} />
        <StatCard label="Gains à remettre" value={s.winsPending} />
        <StatCard label="Gains remis" value={s.winsRedeemed} />
        <StatCard label="Échanges fidélité" value={s.redemptionsTotal} />
        <StatCard label="Parties (7 j)" value={s.playsWeek} />
        <StatCard label="Clients (total)" value={s.dinersTotal} />
        <StatCard label="Nouveaux clients (7 j)" value={s.dinersWeek} />
      </div>

      {/* Points-adjust tool (full data management) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Ajuster les points d’un client</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Ajoute (ou retire, avec un nombre négatif) des points à un client d’un café.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={adjBiz} onChange={(e) => setAdjBiz(e.target.value)} className={inputCls}>
            <option value="">Café…</option>
            {data.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input value={adjPhone} onChange={(e) => setAdjPhone(e.target.value)} placeholder="Téléphone" className={inputCls} />
          <input value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} placeholder="± points" inputMode="numeric" className={`${inputCls} w-28`} />
          <input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Note (optionnel)" className={`${inputCls} min-w-[140px] flex-1`} />
          <button type="button" onClick={onAdjust} disabled={adjBusy || !adjBiz || !adjPhone.trim() || !adjDelta} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50">
            {adjBusy ? '…' : 'Appliquer'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (téléphone, café…)" className={`${inputCls} min-w-[200px] flex-1`} />
          <select value={bizFilter} onChange={(e) => setBizFilter(e.target.value)} className={inputCls}>
            <option value="all">Tous les cafés</option>
            {data.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={load} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">↻ Actualiser</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'play', 'win', 'redeem', 'points', 'signup'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${typeFilter === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {t === 'all' ? 'Tout' : TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {feed.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">Aucune activité.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {feed.map((ev) => {
              const m = TYPE_META[ev.type]
              return (
                <li key={ev.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-lg" aria-hidden>{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {ev.label}
                      {ev.status && ev.status !== 'pending' && <span className="ml-2 text-xs font-normal text-zinc-400">({ev.status})</span>}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${m.chip}`}>{ev.businessName}</span>
                      {ev.phone || '—'}{ev.sub ? ` · ${ev.sub}` : ''} · {timeAgo(ev.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {ev.type === 'win' && ev.status === 'pending' && (
                      <button type="button" onClick={() => onCancelWin(ev)} disabled={busyKey === ev.key}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">Annuler</button>
                    )}
                    {confirming === ev.key ? (
                      <>
                        <button type="button" onClick={() => onDelete(ev)} disabled={busyKey === ev.key}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{busyKey === ev.key ? '…' : 'Confirmer'}</button>
                        <button type="button" onClick={() => setConfirming(null)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100">Annuler</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirming(ev.key)} aria-label="Supprimer"
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:bg-red-50 hover:text-red-600">Suppr.</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <p className="text-center text-xs text-zinc-400">Les 80 événements les plus récents · données en direct.</p>
    </div>
  )
}
