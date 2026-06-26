'use client'

// Checkout-only sheet. Opened from the OrderBar — no menu re-listing (the diner
// already picked items inline on the menu). Reviews the cart, collects table /
// name / note, places the order, then shows live status. Cart + active-order
// state come from the shared CartProvider.

import { useEffect, useRef, useState } from 'react'
import { useCart, money } from './cart-context'
import { ORDER_STATUS_CUSTOMER, isOrderActive, type OrderStatus } from '@/lib/orders'

const INK = '#1A1410', MUT = '#6B6258', LINE = '#ECE6DD', BG = '#FAF8F5'
const TONE: Record<string, { bg: string; fg: string }> = {
  amber: { bg: '#FEF3C7', fg: '#92400E' }, blue: { bg: '#DBEAFE', fg: '#1E40AF' },
  green: { bg: '#DCFCE7', fg: '#166534' }, zinc: { bg: '#F4F4F5', fg: '#3F3F46' }, red: { bg: '#FEE2E2', fg: '#991B1B' },
}
const STATUS_TONE: Record<OrderStatus, keyof typeof TONE> = { new: 'amber', preparing: 'blue', ready: 'green', delivered: 'zinc', rejected: 'red' }

export default function CheckoutSheet({ slug, businessName, accent = '#F47B20' }: { slug: string; businessName: string; accent?: string }) {
  const { lines, count, total, inc, dec, clear, open, setOpen, order, setOrder } = useCart()
  const [table, setTable] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rescan, setRescan] = useState(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const submitting = useRef(false) // in-flight guard (ref beats the async busy-state gap)

  const sent = !!(order && isOrderActive(order.status))

  // Prefill the table from the ?t= QR param or a remembered value.
  useEffect(() => {
    let t = ''
    try { t = new URLSearchParams(window.location.search).get('t') || localStorage.getItem('scaniha_table_' + slug) || '' } catch {}
    if (t) { setTable(t); try { localStorage.setItem('scaniha_table_' + slug, t) } catch {} }
  }, [slug])

  // Escape closes; lock body scroll + focus while open.
  useEffect(() => {
    if (!open) return
    sheetRef.current?.focus()
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, setOpen])

  async function submit() {
    if (submitting.current) return // block double-click before busy-state applies
    if (!table.trim() || count === 0) { setError('Indiquez votre table et au moins un article.'); return }
    submitting.current = true
    setBusy(true); setError(null); setRescan(false)
    try {
      const items = lines.map((l) => ({ itemId: l.item.id, qty: l.qty }))
      // Stable idempotency key per cart: a retry after a dropped response reuses
      // it, so place_order returns the SAME order instead of creating a duplicate.
      const idemK = 'scaniha_orderidem_' + slug
      let idem = ''
      try { idem = localStorage.getItem(idemK) || '' } catch {}
      if (!idem) {
        idem = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
        try { localStorage.setItem(idemK, idem) } catch {}
      }
      const res = await fetch(`/api/order/${slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: table.trim(), name: name.trim() || undefined, note: note.trim() || undefined, items, idem }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 403 && j?.rescanRequired) { setRescan(true); return }
      if (!res.ok || !j?.ok) { setError(j?.error || 'Commande momentanément indisponible.'); return }
      // Order is in — store its id and burn the idem key so the next cart is fresh.
      try { localStorage.setItem('scaniha_order_' + slug, j.orderId); localStorage.removeItem(idemK) } catch {}
      setOrder({ id: j.orderId, status: 'new', total: Number(j.total) || total })
      clear()
    } catch { setError('Connexion impossible. Réessayez.') } finally { setBusy(false); submitting.current = false }
  }

  function startNew() {
    setOrder(null); setError(null); setRescan(false)
    try { localStorage.removeItem('scaniha_order_' + slug) } catch {}
    setOpen(false)
  }

  if (!open) return null

  return (
    <div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Votre commande" className="fixed inset-0 z-[200] flex flex-col bg-white outline-none" style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: LINE }}>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold" style={{ color: INK }}>{sent ? 'Votre commande' : 'Votre panier'}</p>
          <p className="truncate text-xs" style={{ color: MUT }}>{sent ? businessName : 'Vérifiez et commandez'}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[#FAF7F3]" style={{ color: MUT }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>

      {/* ── SENT / STATUS ── */}
      {sent ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" style={{ background: BG }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🛎️</div>
          <h2 className="mt-4 text-xl font-bold" style={{ color: INK }}>Commande envoyée&nbsp;!</h2>
          {table && <p className="mt-1 text-sm" style={{ color: MUT }}>Table {table}{order!.total > 0 ? ` · ${money(order!.total)}` : ''}</p>}
          <div className="mt-5 rounded-full px-4 py-2 text-sm font-bold" role="status" aria-live="polite" style={{ backgroundColor: TONE[STATUS_TONE[order!.status]].bg, color: TONE[STATUS_TONE[order!.status]].fg }}>
            {ORDER_STATUS_CUSTOMER[order!.status]}
          </div>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed" style={{ color: MUT }}>Le statut se met à jour automatiquement. Vous payez à votre table.</p>
          <a href={`/${slug}/commande/${order!.id}`} className="mt-7 inline-block rounded-2xl px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Ouvrir le suivi</a>
          <button type="button" onClick={startNew} className="mt-3 text-sm font-semibold underline-offset-2 hover:underline" style={{ color: accent }}>Nouvelle commande</button>
          <button type="button" onClick={() => setOpen(false)} className="mt-3 text-xs font-medium underline-offset-2 hover:underline" style={{ color: MUT }}>Fermer</button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3" style={{ background: BG }}>
            <div className="space-y-2">
              {lines.length === 0 && (
                <div className="rounded-2xl bg-white px-4 py-10 text-center" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <p className="text-sm font-medium" style={{ color: INK }}>Votre panier est vide.</p>
                  <p className="mt-1 text-xs" style={{ color: MUT }}>Ajoutez des articles depuis le menu.</p>
                  <button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Voir le menu</button>
                </div>
              )}
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: INK }}>{l.item.name}</p>
                    {l.item.price != null && <p className="text-xs" style={{ color: MUT }}>{money((l.item.price || 0) * l.qty)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button type="button" onClick={() => dec(l.item.id)} aria-label={`Retirer ${l.item.name}`} className="grid h-8 w-8 place-items-center rounded-full border transition active:scale-90" style={{ borderColor: LINE, color: INK }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums" style={{ color: INK }}>{l.qty}</span>
                    <button type="button" onClick={() => inc(l.item.id)} aria-label={`Ajouter ${l.item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-white transition active:scale-90" style={{ backgroundColor: accent }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
                  </div>
                </div>
              ))}
            </div>

            {lines.length > 0 && (
              <div className="mt-5 space-y-3 rounded-2xl bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div><label htmlFor="ord-table" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Numéro de table</label><input id="ord-table" value={table} onChange={(e) => setTable(e.target.value)} inputMode="numeric" placeholder="ex. 5" className="w-full rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
                <div><label htmlFor="ord-name" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Votre prénom (optionnel)</label><input id="ord-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom" className="w-full rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
                <div><label htmlFor="ord-note" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Note (optionnel)</label><textarea id="ord-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Sans oignon, bien cuit…" className="w-full resize-none rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
              </div>
            )}
            {rescan && <p role="alert" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">Scannez le QR de votre table pour commander.</p>}
            {error && <p role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
          </div>

          {lines.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3" style={{ borderColor: LINE }}>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border px-5 py-3.5 text-[15px] font-semibold" style={{ borderColor: LINE, color: INK }}>Menu</button>
              <button type="button" onClick={submit} disabled={busy || count === 0} className="flex flex-1 items-center justify-between rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: accent }}><span>{busy ? 'Envoi…' : 'Passer la commande'}</span><span className="tabular-nums">{money(total)}</span></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
