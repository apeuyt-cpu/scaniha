'use client'

import { useCallback, useEffect, useState } from 'react'

type Row = {
  id: number
  actor: string | null
  actor_role: string | null
  action: string
  table_name: string
  row_id: string | null
  business_id: string | null
  created_at: string
  business_name: string | null
  business_slug: string | null
  actor_email: string | null
}

const ROLE_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'super_admin', label: 'Super-admin' },
  { key: 'owner', label: 'Propriétaires' },
  { key: 'system', label: 'Système' },
]

const TABLE_LABEL: Record<string, string> = {
  businesses: 'Établissement', categories: 'Catégorie', items: 'Plat',
  loyalty_programs: 'Programme fidélité', loyalty_rewards: 'Récompense',
  games: 'Roue', prizes: 'Lot', payment_requests: 'Paiement', event: 'Action',
}
const ACTION_LABEL: Record<string, string> = {
  INSERT: 'Création', UPDATE: 'Modification', DELETE: 'Suppression',
  'impersonate.start': 'A ouvert l’admin du café', 'impersonate.stop': 'A quitté l’admin du café',
}
const roleTone: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  owner: 'bg-blue-100 text-blue-700',
  system: 'bg-zinc-100 text-zinc-500',
}
const actionTone: Record<string, string> = {
  INSERT: 'text-green-600', UPDATE: 'text-amber-600', DELETE: 'text-red-600',
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function SuperEyes() {
  const [rows, setRows] = useState<Row[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: '200' })
      if (role) qs.set('role', role)
      const res = await fetch(`/api/super-admin/audit?${qs.toString()}`)
      const j = await res.json()
      setRows(j.items || [])
    } catch {
      /* keep last */
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 15000) // live-ish
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-zinc-900">
            <span aria-hidden="true">👁️</span> Super Eyes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Chaque changement sur la plateforme — qui, quoi, où, quand. Actualisé en direct.</p>
        </div>
        <button onClick={load} className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800">
          Rafraîchir
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRole(f.key)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${role === f.key ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {loading && rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400">
            Aucune activité pour l’instant.
            <span className="mt-1 block text-xs text-zinc-300">Le suivi démarre après l’application de <code>supabase/audit_log.sql</code>.</span>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const isEvent = r.action.includes('.')
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${roleTone[r.actor_role || ''] || 'bg-zinc-100 text-zinc-500'}`}>
                    {r.actor_role === 'super_admin' ? 'SUPER' : r.actor_role === 'owner' ? 'OWNER' : (r.actor_role || 'SYS').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-900">
                      <span className={`font-bold ${actionTone[r.action] || 'text-zinc-700'}`}>{ACTION_LABEL[r.action] || r.action}</span>
                      {!isEvent && <> · <span className="font-semibold">{TABLE_LABEL[r.table_name] || r.table_name}</span></>}
                      {r.business_name && <> · <span className="text-zinc-500">{r.business_name}</span></>}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {r.actor_email || (r.actor_role === 'system' ? 'système' : '—')}
                      {r.business_slug && <span dir="ltr"> · /{r.business_slug}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">{timeAgo(r.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
