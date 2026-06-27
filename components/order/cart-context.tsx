'use client'

// Shared cart state for table-ordering. Lifted out of the old OrderSheet so the
// menu items themselves (in every design) can add to a single cart, a sticky bar
// can summarise it, and a checkout-only sheet can place the order. Persisted per
// slug in localStorage; also tracks the active order so the bar can show its status.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isOrderActive, type OrderStatus } from '@/lib/orders'

export type CartItem = { id: string; name: string; price: number | null }
export type CartLine = { item: CartItem; qty: number }
export type OrderRef = { id: string; status: OrderStatus; total: number }

export function money(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return (Number.isInteger(r) ? String(r) : String(r).replace(/0+$/, '').replace(/\.$/, '')) + ' TND'
}

type CartCtx = {
  slug: string
  lines: CartLine[]
  qty: (id: string) => number
  add: (item: CartItem) => void
  inc: (id: string) => void
  dec: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  count: number
  total: number
  open: boolean
  setOpen: (v: boolean) => void
  order: OrderRef | null
  setOrder: (o: OrderRef | null) => void
  patchOrderStatus: (s: OrderStatus, total?: number) => void
}

const Ctx = createContext<CartCtx | null>(null)

/** Throws if used outside the provider (use inside checkout / bar). */
export function useCart(): CartCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used within <CartProvider>')
  return c
}

/** Safe variant: returns null if there's no provider (the AddToCart button no-ops). */
export function useCartSafe(): CartCtx | null {
  return useContext(Ctx)
}

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [map, setMap] = useState<Record<string, CartLine>>({})
  const [open, setOpenState] = useState(false)
  const [order, setOrderState] = useState<OrderRef | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate cart from localStorage once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('scaniha_cart_' + slug)
      if (raw) { const obj = JSON.parse(raw); if (obj && typeof obj === 'object') setMap(obj) }
    } catch {}
    setHydrated(true)
  }, [slug])

  // Persist cart — only AFTER hydration. setHydrated + setMap batch in the hydrate
  // effect, so the first persist run already sees the loaded cart (never the empty
  // initial map), eliminating the overwrite race.
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('scaniha_cart_' + slug, JSON.stringify(map)) } catch {}
  }, [map, slug, hydrated])

  const lines = useMemo(() => Object.values(map).filter((l) => l.qty > 0), [map])
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const total = lines.reduce((s, l) => s + (l.item.price || 0) * l.qty, 0)

  const qty = useCallback((id: string) => map[id]?.qty || 0, [map])
  const add = useCallback((item: CartItem) => setMap((m) => {
    const cur = m[item.id]
    return { ...m, [item.id]: { item, qty: Math.min(99, (cur?.qty || 0) + 1) } }
  }), [])
  const inc = useCallback((id: string) => setMap((m) => {
    const cur = m[id]; if (!cur) return m
    return { ...m, [id]: { ...cur, qty: Math.min(99, cur.qty + 1) } }
  }), [])
  const dec = useCallback((id: string) => setMap((m) => {
    const cur = m[id]; if (!cur) return m
    const q = cur.qty - 1
    if (q <= 0) { const next = { ...m }; delete next[id]; return next }
    return { ...m, [id]: { ...cur, qty: q } }
  }), [])
  const remove = useCallback((id: string) => setMap((m) => { const next = { ...m }; delete next[id]; return next }), [])
  const clear = useCallback(() => setMap({}), [])
  const setOpen = useCallback((v: boolean) => setOpenState(v), [])
  const setOrder = useCallback((o: OrderRef | null) => setOrderState(o), [])
  const patchOrderStatus = useCallback((s: OrderStatus, t?: number) => setOrderState((o) => (o ? { ...o, status: s, total: t ?? o.total } : o)), [])

  // On mount, reopen an active order's status if one is stored.
  useEffect(() => {
    let id: string | null = null
    try { id = localStorage.getItem('scaniha_order_' + slug) } catch {}
    if (!id) return
    const oid = id
    ;(async () => {
      try {
        const r = await fetch(`/api/order/${slug}?id=${encodeURIComponent(oid)}`)
        const j = await r.json()
        if (j?.ok && isOrderActive(j.status)) setOrderState({ id: oid, status: j.status, total: Number(j.total) || 0 })
        else { try { localStorage.removeItem('scaniha_order_' + slug) } catch {} }
      } catch {}
    })()
  }, [slug])

  // Live status polling while an order is active.
  useEffect(() => {
    if (!order || !isOrderActive(order.status)) return
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/order/${slug}?id=${encodeURIComponent(order.id)}`)
        const j = await r.json()
        if (j?.ok) patchOrderStatus(j.status, Number(j.total) || undefined)
      } catch {}
    }, 5000)
    return () => clearInterval(t)
  }, [order, slug, patchOrderStatus])

  const value: CartCtx = { slug, lines, qty, add, inc, dec, remove, clear, count, total, open, setOpen, order, setOrder, patchOrderStatus }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
