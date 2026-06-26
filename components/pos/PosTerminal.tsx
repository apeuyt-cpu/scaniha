'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/admin/kit/Toast'
import { fmtTnd, type PosProduct, type PaymentMethod } from '@/lib/pos/types'

const QUICK_DISCOUNTS = [5, 10, 15, 20]
const CASH_NOTES = [5, 10, 20, 50]

interface CartLine { product: PosProduct; qty: number }

/**
 * POS terminal — instant local cart. Ringing up products is 100% client-side
 * (zero server round-trips per tap), so it's immediate. The whole sale is sent
 * ONCE at payment to the atomic pos_checkout RPC, which reprices server-side
 * (client price never trusted), pays, and credits loyalty.
 */
export default function PosTerminal() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<PosProduct[]>([])
  const [loyaltyOn, setLoyaltyOn] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [discountPct, setDiscountPct] = useState(0)
  const [cat, setCat] = useState('Tous')
  const [search, setSearch] = useState('')
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/pos', { cache: 'no-store' })
        if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return }
        const j = await res.json()
        if (!cancelled && res.ok) { setProducts(j.products || []); setLoyaltyOn(!!j.loyalty) }
      } catch { /* ignore */ } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => {
    const seen: Record<string, true> = {}
    const out: string[] = ['Tous']
    for (const p of products) { const c = p.category || 'Autres'; if (!seen[c]) { seen[c] = true; out.push(c) } }
    return out
  }, [products])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (cat !== 'Tous' && (p.category || 'Autres') !== cat) return false
      if (q && p.name.toLowerCase().indexOf(q) === -1) return false
      return true
    })
  }, [products, cat, search])

  // Totals computed locally to mirror pos_recompute (prices are TTC).
  const totals = useMemo(() => {
    let subtotal = 0, grossTax = 0
    for (const c of cart) {
      const lt = c.product.price * c.qty
      subtotal += lt
      grossTax += lt - lt / (1 + (c.product.tax_rate || 0))
    }
    const discount = discountPct > 0 ? (subtotal * discountPct) / 100 : 0
    // Embedded TVA scaled to the net actually paid (mirror of pos_recompute).
    const tax = subtotal > 0 ? grossTax * ((subtotal - discount) / subtotal) : 0
    return { subtotal, tax, discount, total: Math.max(0, subtotal - discount), count: cart.reduce((s, c) => s + c.qty, 0) }
  }, [cart, discountPct])

  // ── instant local cart ops (no network) ──
  function addProduct(p: PosProduct) {
    setCart((cur) => {
      const i = cur.findIndex((c) => c.product.id === p.id)
      if (i === -1) return cur.concat([{ product: p, qty: 1 }])
      const next = cur.slice()
      next[i] = { product: next[i].product, qty: Math.min(99, next[i].qty + 1) }
      return next
    })
  }
  function bump(id: string, d: number) {
    setCart((cur) => {
      const i = cur.findIndex((c) => c.product.id === id)
      if (i === -1) return cur
      const q = cur[i].qty + d
      if (q <= 0) return cur.filter((c) => c.product.id !== id)
      const next = cur.slice()
      next[i] = { product: next[i].product, qty: Math.min(99, q) }
      return next
    })
  }
  function newSale() { setCart([]); setDiscountPct(0); setCat('Tous'); setSearch('') }

  // Single atomic checkout. Returns true on success (parent resets).
  async function confirmPayment(payment: { method: PaymentMethod; tendered: number; phone: string }): Promise<boolean> {
    const idemKey = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.round(Math.random() * 1e9)
    const payments = payment.method === 'cash'
      ? [{ method: 'cash', amount: totals.total, tendered: payment.tendered || totals.total }]
      : [{ method: payment.method, amount: totals.total }]
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          lines: cart.map((c) => ({ productId: c.product.id, qty: c.qty })),
          discountKind: discountPct > 0 ? 'pct' : null,
          discountValue: discountPct,
          payments, idemKey, phone: payment.phone.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { error(j?.error === 'insufficient' ? 'Montant insuffisant.' : 'Échec du paiement.'); return false }
      const pts = j?.pointsAdded || 0
      success(pts ? `Vente encaissée ✓ · +${pts} points fidélité` : 'Vente encaissée ✓')
      setCart([]); setDiscountPct(0); setPayOpen(false)
      return true
    } catch { error('Réseau indisponible.'); return false }
  }

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      {/* Catalogue */}
      <div className="flex min-h-0 flex-1 flex-col border-b border-[var(--line)] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-[var(--line)] bg-white px-3 py-2.5">
          <a href="/admin" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Quitter la caisse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </a>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…"
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
          <span className="hidden text-sm font-bold text-[var(--ink)] sm:block">Caisse</span>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-white px-3 py-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${cat === c ? 'bg-[var(--brand)] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Chargement…</p>
          ) : products.length === 0 ? (
            <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-[var(--line)] bg-white p-6 text-center shadow-soft">
              <p className="text-sm font-bold text-[var(--ink)]">Aucun produit</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Ajoutez des produits au catalogue POS pour commencer à vendre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-[var(--line)] bg-white p-3 text-left shadow-soft transition active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-soft-lg"
                  style={p.color ? { borderTopColor: p.color, borderTopWidth: 3 } : undefined}>
                  <span className="text-[15px] font-semibold leading-tight text-[var(--ink)]">{p.name}</span>
                  <span className="mt-2 text-sm font-bold text-[var(--brand-600)]">{fmtTnd(p.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panier */}
      <div className="flex w-full min-h-0 flex-col bg-white lg:w-[380px]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--ink)]">Ticket en cours</p>
            <p className="truncate text-xs text-[var(--muted)]">{totals.count > 0 ? `${totals.count} article(s)` : 'Vide — touchez un produit'}</p>
          </div>
          {cart.length > 0 && <button onClick={newSale} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Vider</button>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <p className="mt-8 text-center text-sm text-[var(--muted)]">Touchez un produit pour commencer.</p>
          ) : (
            <ul className="space-y-1.5">
              {cart.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{l.product.name}</p>
                    <p className="text-xs text-[var(--muted)]">{fmtTnd(l.product.price)} × {l.qty}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => bump(l.product.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-lg font-bold text-zinc-700 hover:bg-zinc-200">–</button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                    <button onClick={() => bump(l.product.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-lg font-bold text-zinc-700 hover:bg-zinc-200">+</button>
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-[var(--ink)]">{fmtTnd(l.product.price * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[var(--line)] px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_DISCOUNTS.map((d) => (
                <button key={d} onClick={() => setDiscountPct(discountPct === d ? 0 : d)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${discountPct === d ? 'bg-[var(--brand)] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
                  -{d}%
                </button>
              ))}
              {discountPct > 0 && <button onClick={() => setDiscountPct(0)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Retirer</button>}
            </div>
            <div className="space-y-1 text-sm">
              <Row label="Sous-total" value={fmtTnd(totals.subtotal)} muted />
              {totals.discount > 0 && <Row label="Remise" value={'– ' + fmtTnd(totals.discount)} muted />}
              {totals.tax > 0 && <Row label="dont TVA" value={fmtTnd(totals.tax)} muted />}
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-bold text-[var(--ink)]">Total</span>
                <span className="text-xl font-bold tabular-nums text-[var(--ink)]">{fmtTnd(totals.total)}</span>
              </div>
            </div>
            <button onClick={() => setPayOpen(true)} disabled={totals.total <= 0}
              className="mt-3 min-h-[52px] w-full rounded-xl bg-[var(--brand)] text-base font-bold text-white shadow-soft transition hover:bg-[var(--brand-600)] disabled:opacity-50">
              Encaisser {fmtTnd(totals.total)}
            </button>
          </div>
        )}
      </div>

      {payOpen && cart.length > 0 && (
        <PaymentSheet total={totals.total} loyaltyOn={loyaltyOn} onClose={() => setPayOpen(false)} onConfirm={confirmPayment} />
      )}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-[var(--muted)]' : 'text-[var(--ink)]'}>{label}</span>
      <span className={`tabular-nums ${muted ? 'text-[var(--muted)]' : 'font-bold text-[var(--ink)]'}`}>{value}</span>
    </div>
  )
}

function PaymentSheet({ total, loyaltyOn, onClose, onConfirm }: {
  total: number; loyaltyOn: boolean; onClose: () => void
  onConfirm: (p: { method: PaymentMethod; tendered: number; phone: string }) => Promise<boolean>
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [tendered, setTendered] = useState('')
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const tnd = Number(tendered.replace(',', '.')) || 0
  const change = method === 'cash' ? Math.max(0, tnd - total) : 0
  // "Montant reçu" is OPTIONAL — empty = exact (confirmPayment defaults it to the
  // total). Only a typed PARTIAL amount blocks, to catch an undercharge typo.
  const enough = method !== 'cash' || tnd === 0 || tnd >= total

  async function go() {
    if (paying) return
    setPaying(true)
    const ok = await onConfirm({ method, tendered: tnd, phone })
    if (!ok) setPaying(false)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-t-3xl border border-[var(--line)] bg-white p-5 shadow-soft-lg sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--ink)]">Encaisser</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--ink)]">{fmtTnd(total)}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setMethod('cash')} className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${method === 'cash' ? 'bg-[var(--brand)] text-white' : 'bg-zinc-100 text-zinc-700'}`}>Espèces</button>
          <button onClick={() => setMethod('card')} className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${method === 'card' ? 'bg-[var(--brand)] text-white' : 'bg-zinc-100 text-zinc-700'}`}>Carte</button>
        </div>

        {method === 'cash' && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">Montant reçu <span className="font-normal">· optionnel</span></span>
              {tnd >= total && tnd > 0 && (
                <span className="text-xs font-semibold text-[var(--ink)]">Rendu&nbsp;<span className="tabular-nums text-[var(--brand-600)]">{fmtTnd(change)}</span></span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input value={tendered} onChange={(e) => setTendered(e.target.value)} inputMode="decimal" placeholder={total.toFixed(3)}
                className="w-20 shrink-0 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm font-bold outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
              <div className="flex flex-1 flex-wrap gap-1">
                <button onClick={() => setTendered(total.toFixed(3))} className="rounded-md bg-zinc-100 px-2 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200">Exact</button>
                {CASH_NOTES.map((n) => (
                  <button key={n} onClick={() => setTendered(String(n))} className="rounded-md bg-zinc-100 px-2 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200">{n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loyaltyOn && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--brand-soft)] p-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-600)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7S10.5 3 8.5 3 6 5 6 5s1 2 2.5 2M12 7s1.5-4 3.5-4S18 5 18 5s-1 2-2.5 2" /></svg>
              Fidélité — téléphone client (optionnel)
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} inputMode="tel" placeholder="ex. 20 123 456"
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
            <p className="mt-1 text-[11px] text-[var(--muted)]">Points crédités automatiquement. Laisser vide si pas de carte.</p>
          </div>
        )}

        <button onClick={go} disabled={paying || !enough}
          className="mt-5 min-h-[52px] w-full rounded-xl bg-green-600 text-base font-bold text-white transition hover:bg-green-700 disabled:opacity-50">
          {paying ? 'Validation…' : 'Valider le paiement'}
        </button>
      </div>
    </div>
  )
}
