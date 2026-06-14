'use client'

import { useState } from 'react'
import { PLANS, PAYMENT_PLANS, PAYMENT_METHODS, MAX_RECEIPTS, ADDONS, addonsTotal, type PlanId, type PaymentMethodId, type AddonId } from '@/lib/payment-config'
import { uploadImage } from '@/lib/storage'

interface PaymentRequestModalProps {
  businessId: string
  open: boolean
  onClose: () => void
  /**
   * True for an existing customer (already on a paid plan, renewing/extending).
   * They already have their QR supports, so the physical-add-ons upsell is hidden
   * — they only pick a plan. New (pending) businesses still see the add-ons.
   */
  existingCustomer?: boolean
}

export default function PaymentRequestModal({ businessId, open, onClose, existingCustomer = false }: PaymentRequestModalProps) {
  const [step, setStep] = useState<'plan' | 'form' | 'done'>('plan')
  const [plan, setPlan] = useState<PlanId | null>(null)
  const [method, setMethod] = useState<PaymentMethodId | null>(null)
  const [receipts, setReceipts] = useState<string[]>([])
  const [addons, setAddons] = useState<Partial<Record<AddonId, number>>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setStep('plan'); setPlan(null); setMethod(null)
    setReceipts([]); setAddons({}); setError(null); setSubmitting(false); setUploading(false)
  }
  const close = () => { reset(); onClose() }

  // The plan sent to the API. "À vie" (lifetime) grants a real lifetime — its
  // grantsDays is null, so approval sets expires_at to null (no expiry).
  const effectivePlan = plan
  const planLabel = effectivePlan ? PAYMENT_PLANS[effectivePlan].label : ''
  const planPrice = effectivePlan ? PAYMENT_PLANS[effectivePlan].price : 0

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === method)
  const extrasTotal = addonsTotal(addons)
  const grandTotal = planPrice + extrasTotal

  const setQty = (id: AddonId, qty: number) => {
    const max = ADDONS.find((a) => a.id === id)?.max ?? 99
    setAddons((cur) => ({ ...cur, [id]: Math.max(0, Math.min(max, qty)) }))
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const room = MAX_RECEIPTS - receipts.length
    const toUpload = Array.from(files).slice(0, room)
    if (toUpload.length === 0) {
      setError(`Maximum ${MAX_RECEIPTS} reçus.`)
      return
    }
    setUploading(true)
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue
        const url = await uploadImage(file, `receipts/${businessId}`)
        setReceipts((cur) => [...cur, url])
      }
    } catch (err: any) {
      setError(err.message || 'Échec du téléversement')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!plan || !method || receipts.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const addonList = Object.entries(addons)
        .filter(([, qty]) => (qty || 0) > 0)
        .map(([id, qty]) => ({ id, qty }))
      const res = await fetch('/api/payment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, plan: effectivePlan, method, receiptUrls: receipts, addons: addonList }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Échec de l’envoi')
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="ltr">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <button onClick={close} className="absolute right-4 top-4 text-2xl leading-none text-zinc-400 hover:text-zinc-600" aria-label="Fermer">
          ✕
        </button>

        {/* STEP 1 — choose a plan + physical add-ons */}
        {step === 'plan' && (
          <>
            <h2 className="text-xl font-bold text-zinc-900">Choisissez un forfait</h2>
            <p className="mt-1 text-sm text-zinc-500">Sélectionnez la durée de votre abonnement.</p>
            <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
              ✓ Votre menu et vos réglages sont conservés — réactivation immédiate après validation du paiement.
            </p>
            <div className="mt-5 space-y-3">
              {(Object.values(PLANS)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                    plan === p.id
                      ? 'border-orange-400 bg-orange-50/60 ring-1 ring-orange-300'
                      : 'border-zinc-200 hover:border-orange-400 hover:bg-orange-50/40'
                  }`}
                >
                  <span className="font-semibold text-zinc-900">{p.label}</span>
                  <span className="text-lg font-bold text-zinc-900">{p.price} TND</span>
                </button>
              ))}
            </div>

            {plan === 'lifetime' && (
              <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                Paiement unique de 600 TND — accès à vie, sans expiration.
              </p>
            )}

            {/* Physical add-ons — compact one-row-per-item.
                Hidden for existing customers (renewals): they already have their
                QR supports, so a renewal only needs a plan, not the upsell. */}
            {!existingCustomer && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">Supports QR <span className="font-normal text-zinc-400">(optionnel)</span></h3>
                  <span className="text-[11px] text-zinc-400">1 par table</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {ADDONS.map((a) => {
                    const qty = addons[a.id] || 0
                    return (
                      <div key={a.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${qty > 0 ? 'border-orange-300 bg-orange-50/40' : 'border-zinc-200'}`}>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-zinc-900">
                            <span aria-hidden="true">{a.emoji}</span> {a.label}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {a.price} TND {a.unit}
                            {qty > 0 && <span className="font-bold text-orange-600"> · {qty * a.price} TND</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => setQty(a.id, qty - 1)} aria-label="Moins" className="h-7 w-7 rounded-lg border border-zinc-200 text-base font-bold text-zinc-600 hover:border-zinc-300 disabled:opacity-40" disabled={qty === 0}>−</button>
                          <input
                            type="number"
                            min={0}
                            max={a.max}
                            value={qty}
                            onChange={(e) => setQty(a.id, Number(e.target.value))}
                            className="h-7 w-10 rounded-lg border border-zinc-200 text-center text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button type="button" onClick={() => setQty(a.id, qty + 1)} aria-label="Plus" className="h-7 w-7 rounded-lg border border-zinc-200 text-base font-bold text-zinc-600 hover:border-zinc-300">+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Total + continue */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span className="text-sm font-medium text-zinc-600">Total</span>
              <span className="text-lg font-extrabold text-zinc-900">{grandTotal} TND</span>
            </div>
            <button
              type="button"
              onClick={() => plan && setStep('form')}
              disabled={!plan}
              className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {plan ? 'Continuer →' : 'Choisissez un forfait pour continuer'}
            </button>
          </>
        )}

        {/* STEP 2 — payment form */}
        {step === 'form' && plan && (
          <>
            <button onClick={() => setStep('plan')} className="mb-3 text-sm font-medium text-zinc-500 hover:text-zinc-900">
              ← Changer de forfait
            </button>
            <h2 className="text-xl font-bold text-zinc-900">Paiement — {planLabel}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Montant : <span className="font-semibold text-zinc-900">{grandTotal} TND</span>
              {extrasTotal > 0 && (
                <span className="text-zinc-400"> ({planPrice} forfait + {extrasTotal} supports)</span>
              )}
            </p>

            <div className="mt-5 space-y-5">
              {/* Method */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Méthode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        method === m.id
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {selectedMethod && (
                  <div className="mt-3 rounded-xl bg-zinc-50 p-4 text-sm">
                    <p className="text-zinc-600">{selectedMethod.instructions}</p>
                    <p className="mt-2 whitespace-pre-line font-mono font-semibold leading-relaxed text-zinc-900">{selectedMethod.details}</p>
                  </div>
                )}
              </div>

              {/* Receipts */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Reçu(s) de paiement <span className="font-normal text-zinc-400">(max {MAX_RECEIPTS})</span>
                </label>
                {receipts.length > 0 && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {receipts.map((url, i) => (
                      <div key={url} className="relative overflow-hidden rounded-lg border border-zinc-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Reçu ${i + 1}`} className="h-20 w-full object-cover" />
                        <button
                          onClick={() => setReceipts((cur) => cur.filter((u) => u !== url))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white hover:bg-black/80"
                          aria-label="Retirer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {receipts.length < MAX_RECEIPTS && (
                  <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-orange-400 hover:text-orange-600">
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
                    {uploading ? 'Téléversement…' : '+ Ajouter un reçu'}
                  </label>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <button
                onClick={submit}
                disabled={submitting || uploading || !method || receipts.length === 0}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </>
        )}

        {/* STEP 3 — done */}
        {step === 'done' && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
            <h2 className="text-xl font-bold text-zinc-900">Demande envoyée</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
              Votre paiement sera vérifié et votre abonnement activé après validation du reçu.
            </p>
            <button onClick={close} className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
