'use client'

// Floating "appel serveur" control for the public menu (table ordering on).
// Bottom-LEFT so it clears the MenuDock (bottom-right). Hides itself when the
// OrderBar/checkout owns the bottom (cart has items / an order is in flight / the
// sheet is open) so the two never overlap. Calls are presence-gated server-side.

import { useEffect, useRef, useState } from 'react'
import { useCartSafe } from './cart-context'
import { isOrderActive } from '@/lib/orders'

type Result = null | 'service' | 'bill' | 'rescan' | 'error'

export default function ServiceCallButton({ slug, accent = '#F47B20' }: { slug: string; accent?: string }) {
  const cart = useCartSafe()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const [table, setTable] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let t = ''
    try { t = new URLSearchParams(window.location.search).get('t') || localStorage.getItem('scaniha_table_' + slug) || '' } catch {}
    setTable(t)
  }, [slug])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // The OrderBar / checkout sheet owns the bottom — don't compete with it.
  const barShowing = !!cart && (cart.open || cart.count > 0 || !!(cart.order && isOrderActive(cart.order.status)))
  if (barShowing) return null

  async function call(kind: 'service' | 'bill') {
    setBusy(true); setResult(null)
    try {
      const res = await fetch(`/api/order/${slug}/call`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, kind }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 403 && j?.rescanRequired) { setResult('rescan'); return }
      if (!res.ok || !j?.ok) { setResult('error'); return }
      setResult(kind)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => { setOpen(false); setResult(null) }, 3200)
    } catch {
      setResult('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed left-4 z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+20px)]">
      {open && (
        <div role="dialog" aria-label="Appeler le serveur" className="mb-2 w-64 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_18px_44px_-14px_rgba(0,0,0,0.5)]">
          {result === 'service' || result === 'bill' ? (
            <div className="px-4 py-5 text-center">
              <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full text-2xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🛎️</div>
              <p className="text-sm font-bold text-[#1A1410]">{result === 'bill' ? 'L’addition arrive !' : 'Le serveur arrive !'}</p>
              <p className="mt-0.5 text-xs text-[#6B6258]">{table ? `Table ${table}` : ''}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[#ECE6DD] px-3.5 py-2.5">
                <p className="text-sm font-bold text-[#1A1410]">Besoin d’aide&nbsp;?</p>
                <button type="button" onClick={() => { setOpen(false); setResult(null) }} aria-label="Fermer" className="grid h-7 w-7 place-items-center rounded-full text-[#6B6258] hover:bg-[#FAF7F3]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-2.5">
                <button type="button" disabled={busy} onClick={() => call('service')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: accent }}>
                  <span className="text-lg" aria-hidden="true">🙋</span> Appeler le serveur
                </button>
                <button type="button" disabled={busy} onClick={() => call('bill')} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#ECE6DD] px-3 py-3 text-left text-sm font-semibold text-[#1A1410] transition active:scale-[0.99] disabled:opacity-60">
                  <span className="text-lg" aria-hidden="true">🧾</span> Demander l’addition
                </button>
                {result === 'rescan' && <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">Scannez le QR de votre table.</p>}
                {result === 'error' && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">Réessayez dans un instant.</p>}
              </div>
            </>
          )}
        </div>
      )}

      <button type="button" onClick={() => { setOpen((v) => !v); setResult(null) }} aria-label="Appeler le serveur" aria-expanded={open}
        className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-10px_rgba(0,0,0,0.45)] transition active:scale-95"
        style={{ backgroundColor: accent }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        Serveur
      </button>
    </div>
  )
}
