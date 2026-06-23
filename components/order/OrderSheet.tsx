'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ORDER_STATUS_CUSTOMER, isOrderActive, type OrderStatus } from '@/lib/orders'

type Item = { id: string; name: string; description?: string | null; price: number | null; image_url?: string | null; available: boolean }
type Cat = { id: string; name: string; items: Item[] }
type Phase = 'menu' | 'cart' | 'sent'

const INK = '#1A1410', MUT = '#6B6258', LINE = '#ECE6DD', BG = '#FAF8F5'
const TONE: Record<string, { bg: string; fg: string }> = {
  amber: { bg: '#FEF3C7', fg: '#92400E' }, blue: { bg: '#DBEAFE', fg: '#1E40AF' },
  green: { bg: '#DCFCE7', fg: '#166534' }, zinc: { bg: '#F4F4F5', fg: '#3F3F46' }, red: { bg: '#FEE2E2', fg: '#991B1B' },
}
const STATUS_TONE: Record<OrderStatus, keyof typeof TONE> = { new: 'amber', preparing: 'blue', ready: 'green', delivered: 'zinc', rejected: 'red' }

function money(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return (Number.isInteger(r) ? String(r) : String(r).replace(/0+$/, '').replace(/\.$/, '')) + ' TND'
}

export default function OrderSheet({ slug, businessName, accent = '#F47B20', categories }: { slug: string; businessName: string; accent?: string; categories: Cat[] }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('menu')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rescan, setRescan] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [sentTotal, setSentTotal] = useState(0)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  // Flat item lookup (id → item), available only.
  const itemsById: Record<string, Item> = {}
  for (let i = 0; i < categories.length; i++) {
    const its = categories[i].items || []
    for (let j = 0; j < its.length; j++) if (its[j].available) itemsById[its[j].id] = its[j]
  }

  const cartIds = Object.keys(cart).filter((id) => cart[id] > 0 && itemsById[id])
  const count = cartIds.reduce((n, id) => n + cart[id], 0)
  const total = cartIds.reduce((s, id) => s + (itemsById[id].price || 0) * cart[id], 0)

  const setQty = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(99, qty)) }))

  // Prefill the table from the ?t= QR param or a remembered value.
  useEffect(() => {
    let t = ''
    try { t = new URLSearchParams(window.location.search).get('t') || localStorage.getItem('scaniha_table_' + slug) || '' } catch {}
    if (t) { setTable(t); try { localStorage.setItem('scaniha_table_' + slug, t) } catch {} }
  }, [slug])

  // Reopen an active order's status if one is stored.
  const pollStatus = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/order/${slug}?id=${encodeURIComponent(id)}`)
      const j = await r.json()
      if (j?.ok) { setStatus(j.status); setSentTotal(Number(j.total) || 0); return j.status as OrderStatus }
    } catch {}
    return null
  }, [slug])

  useEffect(() => {
    let id: string | null = null
    try { id = localStorage.getItem('scaniha_order_' + slug) } catch {}
    if (!id) return
    pollStatus(id).then((st) => { if (st && isOrderActive(st)) { setOrderId(id); setPhase('sent') } else { try { localStorage.removeItem('scaniha_order_' + slug) } catch {} } })
  }, [slug, pollStatus])

  // Live status polling while the sheet shows an active order.
  useEffect(() => {
    if (phase !== 'sent' || !orderId || (status && !isOrderActive(status))) return
    const t = setInterval(() => { pollStatus(orderId) }, 5000)
    return () => clearInterval(t)
  }, [phase, orderId, status, pollStatus])

  // Escape closes; focus the sheet on open.
  useEffect(() => {
    if (!open) return
    sheetRef.current?.focus()
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open])

  async function submit() {
    if (!table.trim() || count === 0) { setError('Indiquez votre table et au moins un article.'); return }
    setBusy(true); setError(null); setRescan(false)
    try {
      const items = cartIds.map((id) => ({ itemId: id, qty: cart[id] }))
      const res = await fetch(`/api/order/${slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: table.trim(), name: name.trim() || undefined, note: note.trim() || undefined, items }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 403 && j?.rescanRequired) { setRescan(true); return }
      if (!res.ok || !j?.ok) { setError(j?.error || 'Commande momentanément indisponible.'); return }
      try { localStorage.setItem('scaniha_order_' + slug, j.orderId) } catch {}
      setOrderId(j.orderId); setStatus('new'); setSentTotal(Number(j.total) || total); setCart({}); setPhase('sent')
    } catch { setError('Connexion impossible. Réessayez.') } finally { setBusy(false) }
  }

  function startNew() { setOrderId(null); setStatus(null); setRescan(false); setError(null); setPhase('menu'); try { localStorage.removeItem('scaniha_order_' + slug) } catch {} }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label="Commander"
        className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_34px_-12px_rgba(0,0,0,0.5)] transition active:scale-95"
        style={{ backgroundColor: accent }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
        Commander{count > 0 && <span className="ml-0.5 grid h-6 min-w-[24px] place-items-center rounded-full bg-white/25 px-1.5 text-xs font-extrabold tabular-nums">{count}</span>}
      </button>
    )
  }

  return (
    <div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Commander" className="fixed inset-0 z-[200] flex flex-col bg-white outline-none" style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: LINE }}>
        <div className="min-w-0"><p className="truncate text-[15px] font-bold" style={{ color: INK }}>{phase === 'cart' ? 'Votre panier' : phase === 'sent' ? 'Votre commande' : businessName}</p>{phase === 'menu' && <p className="text-xs" style={{ color: MUT }}>Choisissez vos articles</p>}</div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[#FAF7F3]" style={{ color: MUT }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>

      {/* ── MENU ── */}
      {phase === 'menu' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 pb-28 pt-2" style={{ background: BG }}>
            {categories.map((c) => {
              const its = (c.items || []).filter((i) => i.available)
              if (its.length === 0) return null
              return (
                <section key={c.id} className="mt-4">
                  <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: MUT }}>{c.name}</h2>
                  <div className="space-y-2">
                    {its.map((it) => {
                      const q = cart[it.id] || 0
                      return (
                        <div key={it.id} className="flex items-center gap-3 rounded-2xl bg-white p-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                          {it.image_url && <img src={it.image_url} alt="" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold" style={{ color: INK }}>{it.name}</p>
                            {it.description && <p className="truncate text-xs" style={{ color: MUT }}>{it.description}</p>}
                            {it.price != null && <p className="mt-0.5 text-sm font-bold" style={{ color: INK }}>{money(it.price)}</p>}
                          </div>
                          {q === 0 ? (
                            <button type="button" onClick={() => setQty(it.id, 1)} aria-label={`Ajouter ${it.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition active:scale-90" style={{ backgroundColor: accent }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
                          ) : (
                            <div className="flex shrink-0 items-center gap-2.5">
                              <button type="button" onClick={() => setQty(it.id, q - 1)} aria-label={`Retirer ${it.name}`} className="grid h-8 w-8 place-items-center rounded-full border transition active:scale-90" style={{ borderColor: LINE, color: INK }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
                              <span className="w-5 text-center text-sm font-bold tabular-nums" style={{ color: INK }} aria-label={`Quantité ${q}`}>{q}</span>
                              <button type="button" onClick={() => setQty(it.id, q + 1)} aria-label={`Ajouter ${it.name}`} className="grid h-8 w-8 place-items-center rounded-full text-white transition active:scale-90" style={{ backgroundColor: accent }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
          {count > 0 && (
            <div className="absolute inset-x-0 bottom-0 border-t bg-white p-3" style={{ borderColor: LINE }}>
              <button type="button" onClick={() => setPhase('cart')} className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]" style={{ backgroundColor: accent }}>
                <span>Voir le panier · {count} article{count > 1 ? 's' : ''}</span><span className="tabular-nums">{money(total)}</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── CART / CHECKOUT ── */}
      {phase === 'cart' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3" style={{ background: BG }}>
            <div className="space-y-2">
              {cartIds.length === 0 && <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm" style={{ color: MUT }}>Votre panier est vide.</p>}
              {cartIds.map((id) => { const it = itemsById[id]; const q = cart[id]; return (
                <div key={id} className="flex items-center gap-3 rounded-2xl bg-white p-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" style={{ color: INK }}>{it.name}</p>{it.price != null && <p className="text-xs" style={{ color: MUT }}>{money((it.price || 0) * q)}</p>}</div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button type="button" onClick={() => setQty(id, q - 1)} aria-label={`Retirer ${it.name}`} className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: LINE, color: INK }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums" style={{ color: INK }}>{q}</span>
                    <button type="button" onClick={() => setQty(id, q + 1)} aria-label={`Ajouter ${it.name}`} className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ backgroundColor: accent }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
                  </div>
                </div>
              )})}
            </div>
            <div className="mt-5 space-y-3 rounded-2xl bg-white p-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div><label htmlFor="ord-table" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Numéro de table</label><input id="ord-table" value={table} onChange={(e) => setTable(e.target.value)} inputMode="numeric" placeholder="ex. 5" className="w-full rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
              <div><label htmlFor="ord-name" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Votre prénom (optionnel)</label><input id="ord-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom" className="w-full rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
              <div><label htmlFor="ord-note" className="mb-1 block text-xs font-semibold" style={{ color: MUT }}>Note (optionnel)</label><textarea id="ord-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Sans oignon, bien cuit…" className="w-full resize-none rounded-xl border px-3 py-2.5 text-base outline-none" style={{ borderColor: LINE, color: INK }} /></div>
            </div>
            {rescan && <p role="alert" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">Scannez le QR de votre table pour commander.</p>}
            {error && <p role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3" style={{ borderColor: LINE }}>
            <button type="button" onClick={() => setPhase('menu')} className="rounded-2xl border px-5 py-3.5 text-[15px] font-semibold" style={{ borderColor: LINE, color: INK }}>Ajouter</button>
            <button type="button" onClick={submit} disabled={busy || count === 0} className="flex flex-1 items-center justify-between rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: accent }}><span>{busy ? 'Envoi…' : 'Passer la commande'}</span><span className="tabular-nums">{money(total)}</span></button>
          </div>
        </>
      )}

      {/* ── SENT / STATUS ── */}
      {phase === 'sent' && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" style={{ background: BG }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🛎️</div>
          <h2 className="mt-4 text-xl font-bold" style={{ color: INK }}>Commande envoyée&nbsp;!</h2>
          {table && <p className="mt-1 text-sm" style={{ color: MUT }}>Table {table}{sentTotal > 0 ? ` · ${money(sentTotal)}` : ''}</p>}
          <div className="mt-5 rounded-full px-4 py-2 text-sm font-bold" role="status" aria-live="polite" style={status ? { backgroundColor: TONE[STATUS_TONE[status]].bg, color: TONE[STATUS_TONE[status]].fg } : undefined}>
            {status ? ORDER_STATUS_CUSTOMER[status] : 'Mise à jour…'}
          </div>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed" style={{ color: MUT }}>Le statut se met à jour automatiquement. Vous payez à votre table.</p>
          <button type="button" onClick={startNew} className="mt-7 rounded-2xl px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Nouvelle commande</button>
          <button type="button" onClick={() => setOpen(false)} className="mt-3 text-xs font-medium underline-offset-2 hover:underline" style={{ color: MUT }}>Fermer</button>
        </div>
      )}
    </div>
  )
}
