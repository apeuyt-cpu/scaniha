'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/admin/kit/Button'
import Field, { inputClass } from '@/components/admin/kit/Field'
import Toggle from '@/components/admin/kit/Toggle'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'
import { useToast } from '@/components/admin/kit/Toast'
import { Skeleton } from '@/components/admin/kit/Skeleton'

const ROLES = ['cashier', 'server', 'manager', 'owner'] as const
const ROLE_LABEL: Record<string, string> = { cashier: 'Caissier', server: 'Serveur', manager: 'Manager', owner: 'Propriétaire' }
const ROLE_TONE: Record<string, string> = {
  cashier: 'bg-zinc-100 text-zinc-600', server: 'bg-blue-50 text-blue-700',
  manager: 'bg-[var(--brand-soft)] text-[var(--brand-600)]', owner: 'bg-green-50 text-green-700',
}
function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

interface Row { id: string; label: string; role: string; last_login_at: string | null; locked_until: string | null }
interface AuditRow { id: number; actor_label: string | null; action: string; amount: number | null; detail: string | null; created_at: string }

const ACTION_LABEL: Record<string, string> = {
  staff_login: 'Connexion', staff_logout: 'Déconnexion', pos_sale: 'Vente POS', comptoir_win: 'Gain au comptoir',
  caisse_award: 'Points crédités', sale_void: 'Vente annulée', discount_apply: 'Remise', refund: 'Remboursement',
}

/**
 * Unified staff & access (app_staff). One PIN identity used across admin + POS +
 * fidélité. Owner toggles "exiger un PIN à la connexion" here; roles drive what
 * each member can do (enforced server-side). Replaces the two old managers.
 */
export default function StaffManager() {
  const toast = useToast()
  const [staff, setStaff] = useState<Row[]>([])
  const [pinEnabled, setPinEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingFlag, setSavingFlag] = useState(false)
  const [label, setLabel] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState<string>('cashier')
  const [creating, setCreating] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [audit, setAudit] = useState<AuditRow[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff')
      const j = await res.json().catch(() => ({}))
      if (res.ok) { setStaff(Array.isArray(j.staff) ? j.staff : []); setPinEnabled(!!j.pinEnabled) }
      else toast.error(j.error || 'Chargement impossible.')
    } catch { toast.error('Chargement impossible.') } finally { setLoading(false) }
  }, [toast])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    let alive = true
    fetch('/api/admin/staff/audit').then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.entries) setAudit(j.entries) }).catch(() => {})
    return () => { alive = false }
  }, [staff.length])

  async function toggleFlag(v: boolean) {
    setSavingFlag(true)
    try {
      const res = await fetch('/api/admin/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinEnabled: v }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j.error || 'Échec.'); return }
      setPinEnabled(v); toast.success(v ? 'PIN exigé à la connexion.' : 'PIN désactivé.')
    } catch { toast.error('Échec.') } finally { setSavingFlag(false) }
  }

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim(), pin, role }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j.error || 'Ajout impossible.'); return }
      toast.success('Membre ajouté.'); setLabel(''); setPin(''); setRole('cashier'); load()
    } catch { toast.error('Ajout impossible.') } finally { setCreating(false) }
  }

  async function remove() {
    if (!confirmId) return
    try {
      const res = await fetch('/api/admin/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: confirmId }) })
      if (!res.ok) { toast.error('Désactivation impossible.'); return }
      toast.success('Membre désactivé.'); load()
    } catch { toast.error('Désactivation impossible.') } finally { setConfirmId(null) }
  }

  async function unlock(id: string) {
    try {
      const res = await fetch('/api/admin/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resetLockout: true }) })
      if (res.ok) { toast.success('Membre débloqué.'); load() }
    } catch { toast.error('Échec.') }
  }

  const isLocked = (r: Row) => r.locked_until && new Date(r.locked_until) > new Date()

  return (
    <div className="space-y-6">
      {/* Require-PIN switch */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
        <Toggle
          checked={pinEnabled}
          onChange={toggleFlag}
          disabled={loading || savingFlag}
          label="Exiger un code PIN à la connexion"
          hint="Après le login, chaque employé choisit son nom et entre son PIN. Vous gardez toujours un accès propriétaire."
        />
        {pinEnabled && staff.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">Ajoutez au moins un membre ci-dessous pour que le verrouillage soit utile.</p>
        )}
      </div>

      {/* Add */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
        <h2 className="font-bold text-[var(--ink)]">Ajouter un membre</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label="Nom" htmlFor="st-label"><input id="st-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Sarah" maxLength={40} autoComplete="off" className={inputClass} /></Field></div>
          <div className="sm:w-32"><Field label="Code PIN" htmlFor="st-pin"><input id="st-pin" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" autoComplete="off" className={inputClass} /></Field></div>
          <div className="sm:w-40"><Field label="Rôle" htmlFor="st-role"><select id="st-role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field></div>
          <Button variant="primary" onClick={create} disabled={creating}>{creating ? '…' : 'Ajouter'}</Button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">Code de 4 à 6 chiffres, enregistré de façon sécurisée. Le rôle définit l’accès (caissier, serveur, manager, propriétaire).</p>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
        <h2 className="font-bold text-[var(--ink)]">Équipe</h2>
        {loading ? (
          <div className="mt-4 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : staff.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Aucun membre.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-semibold text-[var(--ink)]">{s.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_TONE[s.role] || ROLE_TONE.cashier}`}>{ROLE_LABEL[s.role] || s.role}</span>
                    {isLocked(s) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Bloqué</span>}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Dernière connexion : {fmt(s.last_login_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isLocked(s) && <button onClick={() => unlock(s.id)} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Débloquer</button>}
                  <button onClick={() => setConfirmId(s.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">Désactiver</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Activity feed — who did what */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
        <h2 className="font-bold text-[var(--ink)]">Journal d’activité</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Qui a fait quoi — connexions, ventes, gains.</p>
        {audit.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Aucune activité enregistrée pour l’instant.</p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2 text-sm last:border-0">
                <span className="min-w-0">
                  <span className="font-semibold text-[var(--ink)]">{a.actor_label || 'Système'}</span>
                  <span className="text-[var(--muted)]"> · {ACTION_LABEL[a.action] || a.action}</span>
                  {a.detail && <span className="text-[var(--muted)]"> — {a.detail}</span>}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted)] tabular-nums">
                  {a.amount != null ? `${Number(a.amount).toFixed(3)} TND · ` : ''}{new Date(a.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog open={confirmId !== null} danger title="Désactiver ce membre ?" message="Son code PIN ne fonctionnera plus." confirmLabel="Désactiver" cancelLabel="Annuler" onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </div>
  )
}
