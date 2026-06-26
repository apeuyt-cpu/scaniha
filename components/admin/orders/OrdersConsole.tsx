'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Card from '@/components/admin/kit/Card'
import { useToast } from '@/components/admin/kit/Toast'
import {
  type Order,
  type OrderStatus,
  ORDER_STATUS_LABEL,
  isOrderActive,
} from '@/lib/orders'

/* ------------------------------------------------------------------ */
/*  Staff order-management console.                                    */
/*  Polls GET /api/admin/orders on mount + every 6s. Active orders     */
/*  (new / preparing / ready) sit at the top, new ones stand out with  */
/*  an amber ring + subtle pulse (reduced-motion safe). Terminées      */
/*  (delivered / rejected) live in a muted group, capped.              */
/* ------------------------------------------------------------------ */

const POLL_MS = 6000
const DONE_CAP = 20

type ServiceCall = { id: string; table_number: string; kind: 'service' | 'bill'; created_at: string }
const CALL_LABEL: Record<ServiceCall['kind'], string> = { service: 'Appel serveur', bill: 'Demande d’addition' }

/** Status-tone → card/badge classes (Tailwind, premium + accessible). */
const TONE: Record<OrderStatus, { badge: string; dot: string }> = {
  new: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  preparing: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  ready: { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  delivered: { badge: 'bg-zinc-100 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' },
  rejected: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
}

/** The action buttons offered for each in-flight status. */
type ActionTone = 'accent' | 'green' | 'red'
interface Action { to: OrderStatus; label: string; tone: ActionTone }
function actionsFor(status: OrderStatus): Action[] {
  switch (status) {
    case 'new':
      return [
        { to: 'preparing', label: 'Accepter', tone: 'accent' },
        { to: 'rejected', label: 'Refuser', tone: 'red' },
      ]
    case 'preparing':
      return [
        { to: 'ready', label: 'Prête', tone: 'green' },
        { to: 'rejected', label: 'Refuser', tone: 'red' },
      ]
    case 'ready':
      return [{ to: 'delivered', label: 'Livrée', tone: 'green' }]
    default:
      return []
  }
}

const ACTION_CLASS: Record<ActionTone, string> = {
  accent: 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]',
  green: 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]',
  red: 'border border-red-200 bg-white text-red-600 hover:bg-red-50 active:scale-[0.98]',
}

function fmtPrice(n: number): string {
  return `${Number(n || 0).toFixed(2)} TND`
}

/** Short French "il y a …" from an ISO timestamp. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return "à l'instant"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days} j`
}

export default function OrdersConsole() {
  const { error: toastError } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [calls, setCalls] = useState<ServiceCall[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  // Re-render every minute so "il y a … min" labels stay fresh between polls.
  const [, setTick] = useState(0)
  const mounted = useRef(true)
  // New-order alerting (sound + browser notification). Needs a user gesture to
  // prime audio/notification permission, so it's opt-in via a button.
  const [alertsOn, setAlertsOn] = useState(false)
  const seen = useRef<Set<string>>(new Set())
  const seeded = useRef(false)
  const audioCtx = useRef<AudioContext | null>(null)

  function enableAlerts() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      audioCtx.current = audioCtx.current || new AC()
      audioCtx.current.resume()
    } catch {}
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}) } catch {}
    setAlertsOn(true)
  }

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' })
      if (!res.ok) {
        if (mounted.current) setLoading(false)
        return
      }
      const data = await res.json().catch(() => null)
      if (mounted.current && data) {
        if (Array.isArray(data.orders)) setOrders(data.orders as Order[])
        setCalls(Array.isArray(data.calls) ? (data.calls as ServiceCall[]) : [])
      }
    } catch {
      /* transient network error — keep the last good list, next poll retries */
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchOrders()
    let poll = setInterval(fetchOrders, POLL_MS)
    // Free-tier friendly: stop polling while the tab is hidden, resume + refetch
    // on focus (a backgrounded console shouldn't keep hitting the DB).
    const onVis = () => {
      if (document.hidden) {
        clearInterval(poll)
      } else {
        fetchOrders()
        poll = setInterval(fetchOrders, POLL_MS)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    const clock = setInterval(() => setTick((t) => t + 1), 60000)
    return () => {
      mounted.current = false
      clearInterval(poll)
      clearInterval(clock)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchOrders])

  // Alert (beep + browser notification) when a genuinely NEW order/call arrives.
  // First load just seeds the seen-set so existing rows don't trigger an alert.
  useEffect(() => {
    const ids = orders.map((o) => o.id).concat(calls.map((c) => c.id))
    if (!seeded.current) {
      seeded.current = true
      ids.forEach((id) => seen.current.add(id))
      return
    }
    let fresh = 0
    for (const id of ids) if (!seen.current.has(id)) { seen.current.add(id); fresh++ }
    if (!fresh || !alertsOn) return
    const ctx = audioCtx.current
    if (ctx) {
      try {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = 880
        g.gain.setValueAtTime(0.0001, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
        o.start(); o.stop(ctx.currentTime + 0.36)
      } catch {}
    }
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Scaniha — nouvelle activité', { body: fresh > 1 ? `${fresh} nouvelles commandes / appels` : 'Nouvelle commande ou appel' })
      }
    } catch {}
  }, [orders, calls, alertsOn])

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      setBusy((b) => ({ ...b, [orderId]: true }))
      // Optimistic: flip the status locally right away.
      setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, status } : o)))
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        })
        if (!res.ok) throw new Error('failed')
        // Re-sync so other staff devices' changes show too. Awaited so `busy`
        // stays set until the truth is back — no re-click on a stale row.
        await fetchOrders()
      } catch {
        toastError('Impossible de mettre à jour la commande. Réessayez.')
        // Roll the optimistic change back by refetching the truth.
        await fetchOrders()
      } finally {
        if (mounted.current) setBusy((b) => ({ ...b, [orderId]: false }))
      }
    },
    [fetchOrders, toastError]
  )

  const resolveCall = useCallback(
    async (callId: string) => {
      setCalls((cur) => cur.filter((c) => c.id !== callId)) // optimistic
      try {
        await fetch('/api/admin/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId }),
        })
      } catch {
        /* refetch restores the truth */
      }
      fetchOrders()
    },
    [fetchOrders]
  )

  // Newest first.
  const sorted = orders
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const active: Order[] = []
  const done: Order[] = []
  sorted.forEach((o) => {
    if (isOrderActive(o.status)) active.push(o)
    else done.push(o)
  })
  const doneCapped = done.slice(0, DONE_CAP)

  let newCount = 0
  active.forEach((o) => {
    if (o.status === 'new') newCount++
  })

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
        <span className="sr-only">Chargement des commandes…</span>
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-orange-500" aria-hidden="true" />
      </div>
    )
  }

  const sortedCalls = calls
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="space-y-8">
      {/* Appels serveur — sit above everything so staff react first. */}
      {sortedCalls.length > 0 && (
        <section aria-label="Appels en attente" className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <span className="text-base" aria-hidden="true">🛎️</span>
            Appels en attente
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white">{sortedCalls.length}</span>
          </h2>
          <ul className="space-y-2">
            {sortedCalls.map((c) => (
              <li key={c.id} className="call-ring flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white">{c.table_number}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-amber-900">Table {c.table_number} · {CALL_LABEL[c.kind]}</p>
                    <p className="text-xs text-amber-700">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => resolveCall(c.id)}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98]"
                >
                  Fait
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Title row + live new-order count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-zinc-900">
          En cours
          {newCount > 0 && (
            <span
              role="status"
              aria-label={`${newCount} nouvelle${newCount > 1 ? 's' : ''} commande${newCount > 1 ? 's' : ''}`}
              className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white"
            >
              {newCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => (alertsOn ? setAlertsOn(false) : enableAlerts())}
            aria-pressed={alertsOn}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${alertsOn ? 'border-green-200 bg-green-50 text-green-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {alertsOn ? <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> : <><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><path d="m1 1 22 22" /></>}
            </svg>
            {alertsOn ? 'Alertes activées' : 'Activer les alertes'}
          </button>
          <span className="hidden text-xs font-medium text-zinc-400 sm:inline" aria-hidden="true">Actualisé auto</span>
        </div>
      </div>

      {/* Active orders */}
      {active.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-zinc-500">Aucune commande pour le moment.</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {active.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} busy={!!busy[o.id]} onUpdate={updateStatus} />
            </li>
          ))}
        </ul>
      )}

      {/* Terminées (muted) */}
      {doneCapped.length > 0 && (
        <section className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-zinc-400">Terminées</h3>
          <ul className="space-y-2.5">
            {doneCapped.map((o) => (
              <li key={o.id}>
                <DoneRow order={o} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reduced-motion-safe pulse for brand-new orders. */}
      <style jsx global>{`
        @keyframes orderPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(245, 158, 11, 0);
          }
        }
        .order-new {
          animation: orderPulse 2.2s ease-out infinite;
        }
        .call-ring {
          animation: orderPulse 2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .order-new,
          .call-ring {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

/* --------------------------- active order card --------------------------- */

function OrderCard({
  order,
  busy,
  onUpdate,
}: {
  order: Order
  busy: boolean
  onUpdate: (id: string, s: OrderStatus) => void
}) {
  const isNew = order.status === 'new'
  const tone = TONE[order.status]
  const actions = actionsFor(order.status)

  return (
    <Card
      className={
        isNew
          ? 'order-new ring-2 ring-amber-300'
          : order.status === 'ready'
            ? 'ring-1 ring-green-200'
            : ''
      }
    >
      {/* Header: table number + status badge + time */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-base font-bold text-white">
            {order.table_number}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight text-zinc-900">
              Table {order.table_number}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(order.created_at)}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Customer name */}
      {order.customer_name && (
        <p className="mt-3 text-sm text-zinc-600">
          <span className="text-zinc-400">Client&nbsp;:</span>{' '}
          <span className="font-medium text-zinc-800">{order.customer_name}</span>
        </p>
      )}

      {/* Note callout */}
      {order.note && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="font-semibold">Note&nbsp;:</span> {order.note}
        </div>
      )}

      {/* Item lines */}
      <ul className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
        {order.items.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-zinc-700">
              <span className="font-semibold text-zinc-900">{line.qty}×</span> {line.name}
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500">
              {fmtPrice(line.price * line.qty)}
            </span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="mt-3 flex items-baseline justify-between border-t border-zinc-100 pt-3">
        <span className="text-sm font-semibold text-zinc-500">Total</span>
        <span className="text-base font-bold tabular-nums text-zinc-900">{fmtPrice(order.total)}</span>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.to}
              type="button"
              disabled={busy}
              onClick={() => onUpdate(order.id, a.to)}
              aria-label={`${a.label} — table ${order.table_number}`}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_CLASS[a.tone]}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

/* --------------------------- done (muted) row --------------------------- */

function DoneRow({ order }: { order: Order }) {
  const tone = TONE[order.status]
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-500">
          {order.table_number}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-600">
            Table {order.table_number}
            {order.customer_name ? ` · ${order.customer_name}` : ''}
          </p>
          <p className="text-xs text-zinc-400">{timeAgo(order.created_at)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums text-zinc-400">{fmtPrice(order.total)}</span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>
    </div>
  )
}
