'use client'

import { useMemo, useState } from 'react'
import { useToast } from './Toast'
import type { BusinessRequest } from '@/lib/db/business-requests'

const PRODUCT_LABEL: Record<string, string> = {
  menu: 'Menu QR', fidelite: 'Fidélité', both: 'Menu + Fidélité', ordering: 'Commande à table', autre: 'Autre',
}
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nouvelle', cls: 'bg-orange-100 text-orange-700' },
  contacted: { label: 'Contacté', cls: 'bg-blue-100 text-blue-700' },
  converted: { label: 'Compte créé', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejetée', cls: 'bg-zinc-200 text-zinc-600' },
  approved: { label: 'Approuvée', cls: 'bg-green-100 text-green-700' },
}

type Filter = 'active' | 'converted' | 'rejected' | 'all'
type Created = { email: string; tempPassword: string | null; isNewUser: boolean; slug: string }

export default function DemandesQueue({ initial }: { initial: BusinessRequest[] }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<BusinessRequest[]>(initial)
  const [filter, setFilter] = useState<Filter>('active')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Approve dialog state.
  const [approveRow, setApproveRow] = useState<BusinessRequest | null>(null)
  const [fName, setFName] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [created, setCreated] = useState<Created | null>(null)
  const [dlgErr, setDlgErr] = useState<string | null>(null)

  const [rejectRow, setRejectRow] = useState<BusinessRequest | null>(null)

  const counts = useMemo(() => ({
    active: rows.filter((r) => r.status === 'new' || r.status === 'contacted').length,
    converted: rows.filter((r) => r.status === 'converted').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    all: rows.length,
  }), [rows])

  const visible = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'active') return r.status === 'new' || r.status === 'contacted'
    return r.status === filter
  })

  function openApprove(r: BusinessRequest) {
    setApproveRow(r); setCreated(null); setDlgErr(null)
    setFName(r.business_name); setFEmail(r.email || ''); setFPhone(r.phone || '')
  }
  function closeApprove() { setApproveRow(null); setCreated(null); setDlgErr(null) }

  async function submitApprove() {
    if (!approveRow) return
    if (!fName.trim()) { setDlgErr("Le nom de l'établissement est requis."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.trim())) { setDlgErr('Une adresse e-mail propriétaire valide est requise.'); return }
    setBusyId(approveRow.id); setDlgErr(null)
    try {
      const res = await fetch('/api/super-admin/businesses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: fName.trim(), ownerEmail: fEmail.trim(), ownerPhone: fPhone.trim() || undefined, plan: approveRow.plan || undefined, requestId: approveRow.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) { setDlgErr(json?.error || 'Échec de la création du compte.'); return }
      setRows((cur) => cur.map((r) => (r.id === approveRow.id ? { ...r, status: 'converted', business_id: json.business?.id ?? null } : r)))
      setCreated({ email: json.owner?.email || fEmail.trim(), tempPassword: json.tempPassword ?? null, isNewUser: !!json.isNewUser, slug: json.business?.slug || '' })
      toast(`Compte créé — « ${fName.trim()} ».`, 'success')
    } catch {
      setDlgErr('Connexion impossible. Réessayez.')
    } finally {
      setBusyId(null)
    }
  }

  async function patchRequest(r: BusinessRequest, action: 'reject' | 'contacted' | 'reopen') {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/super-admin/demandes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Échec.')
      const status = action === 'reject' ? 'rejected' : action === 'contacted' ? 'contacted' : 'new'
      setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, status: status as BusinessRequest['status'] } : x)))
      toast(action === 'reject' ? 'Demande rejetée.' : action === 'contacted' ? 'Marquée comme contactée.' : 'Demande rouverte.', 'success')
      setRejectRow(null)
    } catch (e: any) {
      toast(e.message || 'Une erreur est survenue.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast('Copié.', 'success') } catch { toast('Copie impossible.', 'error') }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'active', label: `À traiter (${counts.active})` },
    { key: 'converted', label: `Converties (${counts.converted})` },
    { key: 'rejected', label: `Rejetées (${counts.rejected})` },
    { key: 'all', label: `Toutes (${counts.all})` },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`rounded-xl px-3 py-1.5 text-sm transition ${filter === f.key ? 'bg-orange-50 font-semibold text-orange-700 ring-1 ring-orange-200' : 'font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
          Aucune demande dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.new
            const canAct = r.status === 'new' || r.status === 'contacted'
            return (
              <div key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{r.business_name}</p>
                    <p className="text-sm text-zinc-500">
                      {r.contact_name} · <a href={`tel:${r.phone}`} className="text-zinc-600 hover:text-orange-600" dir="ltr">{r.phone}</a>
                      {r.email && <> · <a href={`mailto:${r.email}`} className="text-zinc-600 hover:text-orange-600" dir="ltr">{r.email}</a></>}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {PRODUCT_LABEL[r.product] || r.product}{r.city ? ` · ${r.city}` : ''}{r.source ? ` · via ${r.source}` : ''}{r.plan ? ` · ${r.plan}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>

                {r.message && <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{r.message}</p>}

                {canAct && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openApprove(r)} disabled={busyId === r.id}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
                      Approuver & créer le compte
                    </button>
                    {r.status === 'new' && (
                      <button type="button" onClick={() => patchRequest(r, 'contacted')} disabled={busyId === r.id}
                        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50">
                        Marquer contacté
                      </button>
                    )}
                    <button type="button" onClick={() => setRejectRow(r)} disabled={busyId === r.id}
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                      Rejeter
                    </button>
                  </div>
                )}
                {r.status === 'rejected' && (
                  <div className="mt-3">
                    <button type="button" onClick={() => patchRequest(r, 'reopen')} disabled={busyId === r.id}
                      className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-orange-600 hover:underline disabled:opacity-50">
                      Rouvrir
                    </button>
                  </div>
                )}
                {r.status === 'converted' && r.business_id && (
                  <p className="mt-3 text-xs text-green-700">Compte créé · établissement lié.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Approve / create dialog ── */}
      {approveRow && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => busyId === null && closeApprove()}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {created ? (
              <>
                <h3 className="text-lg font-bold text-zinc-900">Compte créé&nbsp;✅</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Transmettez ces identifiants au propriétaire (WhatsApp / en personne). {created.tempPassword ? 'Le mot de passe ne sera plus affiché.' : 'Ce compte existait déjà — aucun nouveau mot de passe généré.'}
                </p>
                <div className="mt-4 space-y-2">
                  <CredRow label="E-mail" value={created.email} onCopy={() => copy(created.email)} />
                  {created.tempPassword && <CredRow label="Mot de passe" value={created.tempPassword} mono onCopy={() => copy(created.tempPassword!)} />}
                  {created.slug && <CredRow label="Lien menu" value={`scaniha.com/${created.slug}`} onCopy={() => copy(`https://scaniha.com/${created.slug}`)} />}
                  <CredRow label="Connexion" value="scaniha.com/login" onCopy={() => copy('https://scaniha.com/login')} />
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={closeApprove} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">Terminé</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-zinc-900">Créer le compte</h3>
                <p className="mt-1 text-sm text-zinc-500">Un compte propriétaire + un menu de démo sont créés. Essai actif de 7 jours.</p>
                <div className="mt-4 space-y-3">
                  <Field label="Nom de l’établissement" id="ap-name" value={fName} onChange={setFName} />
                  <Field label="E-mail du propriétaire" id="ap-email" value={fEmail} onChange={setFEmail} type="email" placeholder="proprio@exemple.com" />
                  <Field label="Téléphone (optionnel)" id="ap-phone" value={fPhone} onChange={setFPhone} type="tel" />
                </div>
                {dlgErr && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{dlgErr}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={closeApprove} disabled={busyId !== null} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800 disabled:opacity-50">Annuler</button>
                  <button onClick={submitApprove} disabled={busyId !== null} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    {busyId !== null ? 'Création…' : 'Créer le compte'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Reject confirm ── */}
      {rejectRow && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => busyId === null && setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900">Rejeter la demande</h3>
            <p className="mt-3 text-sm text-zinc-600">Rejeter la demande de <strong>« {rejectRow.business_name} »</strong> ?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setRejectRow(null)} disabled={busyId !== null} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800 disabled:opacity-50">Annuler</button>
              <button onClick={() => patchRequest(rejectRow, 'reject')} disabled={busyId !== null} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {busyId !== null ? 'Traitement…' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, id, value, onChange, type = 'text', placeholder }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={type === 'email' || type === 'tel' ? 'ltr' : undefined}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  )
}

function CredRow({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <p className={`truncate text-sm text-zinc-900 ${mono ? 'font-mono' : ''}`} dir="ltr">{value}</p>
      </div>
      <button type="button" onClick={onCopy} className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:border-orange-300 hover:text-orange-600">Copier</button>
    </div>
  )
}
