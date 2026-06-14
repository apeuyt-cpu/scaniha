'use client'

import { useEffect, useRef, useState } from 'react'
import { PAYMENT_PLANS } from '@/lib/payment-config'
import { useToast } from './Toast'

/**
 * Escape-to-close + focus trap + focus restore for an overlay.
 * `enabled` lets the confirm dialog ignore Escape while a request is in flight.
 */
function useDialogA11y(
  open: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLElement | null>,
  enabled = true
) {
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    // Move focus into the panel (first focusable, else the panel itself).
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    ;(firstFocusable ?? panel)?.focus?.()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!enabled) return
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, panelRef, enabled])
}

export interface PaymentRow {
  id: string
  businessName: string
  plan: string
  amount: number | null
  method: string
  full_name: string
  receipt_urls: string[]
  created_at: string
  status?: 'pending' | 'approved' | 'rejected'
  addons?: { id: string; label: string; qty: number; unit_price: number; total: number }[] | null
}

type Confirm =
  | { kind: 'approve'; row: PaymentRow; mismatch?: { expected: number; submitted: number | null } }
  | { kind: 'reject'; row: PaymentRow }
  | null

function grantText(plan: string): string {
  const def = PAYMENT_PLANS[plan]
  if (!def) return '—'
  return def.grantsDays === null ? 'À VIE (sans expiration)' : `${def.grantsDays} jours`
}

function expectedAmount(row: PaymentRow): number | null {
  const def = PAYMENT_PLANS[row.plan]
  if (!def) return null
  const addons = Array.isArray(row.addons)
    ? row.addons.reduce((s, a) => s + (Number(a?.total) || 0), 0)
    : 0
  return def.price + addons
}

/**
 * Review manual payment requests: big receipts (click → full-size lightbox).
 * Approve/reject go through an explicit confirmation dialog showing the
 * business, plan, amount and what approval grants. `showHistory` also lists
 * already-processed requests below.
 */
export default function PaymentReview({ requests, showHistory }: { requests: PaymentRow[]; showHistory?: boolean }) {
  const { toast } = useToast()
  const [rows, setRows] = useState(requests)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const confirmRef = useRef<HTMLDivElement>(null)
  const lightboxRef = useRef<HTMLDivElement>(null)

  // Escape closes the confirm dialog only when no request is in flight.
  useDialogA11y(confirm !== null, () => setConfirm(null), confirmRef, busyId === null)
  useDialogA11y(lightbox !== null, () => setLightbox(null), lightboxRef)

  const pending = rows.filter((r) => (r.status ?? 'pending') === 'pending')
  const history = rows.filter((r) => (r.status ?? 'pending') !== 'pending')

  function requestApprove(row: PaymentRow) {
    const expected = expectedAmount(row)
    const submitted = row.amount === null || row.amount === undefined ? null : Number(row.amount)
    const mismatch =
      expected !== null && submitted !== null && Math.abs(submitted - expected) > 0.001
        ? { expected, submitted }
        : undefined
    setConfirm({ kind: 'approve', row, mismatch })
  }

  function requestReject(row: PaymentRow) {
    setConfirm({ kind: 'reject', row })
  }

  async function doAct(action: 'approve' | 'reject', row: PaymentRow, overrideMismatch = false) {
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/super-admin/payment-requests/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, overrideMismatch }),
      })
      const json = await res.json()

      // Server blocked an amount mismatch → re-open the dialog with the override.
      if (res.status === 409 && json.code === 'AMOUNT_MISMATCH') {
        setConfirm({
          kind: 'approve',
          row,
          mismatch: { expected: json.expectedAmount, submitted: json.submittedAmount },
        })
        toast(json.error || 'Le montant ne correspond pas.', 'error')
        return
      }

      if (!res.ok || !json.success) throw new Error(json.error || 'Échec de la mise à jour.')

      setRows((cur) =>
        cur.map((r) =>
          r.id === row.id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        )
      )
      setConfirm(null)
      toast(
        action === 'approve'
          ? `Paiement approuvé — « ${row.businessName} » activé.`
          : `Demande de « ${row.businessName} » rejetée.`,
        'success'
      )
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
          Aucune demande de paiement en attente.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              busy={busyId === r.id}
              onApprove={requestApprove}
              onReject={requestReject}
              onZoom={setLightbox}
            />
          ))}
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Historique</h3>
          <div className="space-y-3">
            {history.map((r) => (
              <RequestCard key={r.id} r={r} readOnly onZoom={setLightbox} />
            ))}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => busyId === null && setConfirm(null)}
        >
          <div
            ref={confirmRef}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirm.kind === 'approve' ? (
              <>
                <h3 className="text-lg font-bold text-zinc-900">Approuver le paiement</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Établissement" value={confirm.row.businessName} />
                  <Row
                    label="Forfait"
                    value={PAYMENT_PLANS[confirm.row.plan]?.label ?? confirm.row.plan}
                  />
                  <Row label="Montant déclaré" value={`${confirm.row.amount ?? '—'} TND`} />
                  <Row label="Prix attendu" value={`${expectedAmount(confirm.row) ?? '—'} TND`} />
                  <Row label="Accorde" value={grantText(confirm.row.plan)} />
                </dl>

                {confirm.mismatch && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span aria-hidden="true">⚠️ </span>Le montant déclaré ({confirm.mismatch.submitted ?? '—'} TND) ne correspond pas
                    au prix attendu ({confirm.mismatch.expected} TND). Vérifiez le reçu avant de forcer
                    l’approbation.
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={busyId !== null}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => doAct('approve', confirm.row, !!confirm.mismatch)}
                    disabled={busyId !== null}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      confirm.mismatch ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {busyId !== null
                      ? 'Traitement…'
                      : confirm.mismatch
                      ? 'Forcer l’approbation'
                      : 'Confirmer & activer'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-zinc-900">Rejeter la demande</h3>
                <p className="mt-3 text-sm text-zinc-600">
                  Rejeter la demande de paiement de <strong>« {confirm.row.businessName} »</strong> ?
                  L’abonnement ne sera pas activé.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={busyId !== null}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => doAct('reject', confirm.row)}
                    disabled={busyId !== null}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {busyId !== null ? 'Traitement…' : 'Rejeter'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu du reçu"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Reçu" className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur hover:bg-white/25"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900">{value}</dd>
    </div>
  )
}

function RequestCard({
  r,
  busy,
  readOnly,
  onApprove,
  onReject,
  onZoom,
}: {
  r: PaymentRow
  busy?: boolean
  readOnly?: boolean
  onApprove?: (r: PaymentRow) => void
  onReject?: (r: PaymentRow) => void
  onZoom: (url: string) => void
}) {
  const status = r.status ?? 'pending'
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{r.businessName}</p>
          <p className="text-sm text-zinc-500">
            {r.full_name} · {PAYMENT_PLANS[r.plan]?.label ?? r.plan} · {r.amount ?? '—'} TND ·{' '}
            {r.method?.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {status === 'approved' ? 'Approuvé' : 'Rejeté'}
            </span>
          )}
          <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString('fr-FR')}</span>
        </div>
      </div>

      {Array.isArray(r.addons) && r.addons.length > 0 && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          À livrer : {r.addons.map((a) => `${a.qty} × ${a.label} (${a.total} TND)`).join(' · ')}
        </div>
      )}

      {(r.receipt_urls || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.receipt_urls.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onZoom(u)}
              className="h-24 w-24 overflow-hidden rounded-xl border border-zinc-200 transition hover:border-orange-400"
              aria-label={`Agrandir le reçu ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Reçu ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onApprove?.(r)}
            disabled={busy}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? 'Traitement…' : 'Approuver & activer'}
          </button>
          <button
            type="button"
            onClick={() => onReject?.(r)}
            disabled={busy}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      )}
    </div>
  )
}
