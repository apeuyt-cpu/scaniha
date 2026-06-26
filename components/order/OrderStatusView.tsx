'use client'

// Standalone, shareable/bookmarkable order-status screen
// (/[slug]/commande/[orderId]). Polls the public status endpoint; the order id
// is an unguessable uuid, so no auth is needed and no private data leaks.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ORDER_STATUS_CUSTOMER, isOrderActive, type OrderStatus } from '@/lib/orders'
import { money } from './cart-context'

const INK = '#1A1410', MUT = '#6B6258', BG = '#FAF8F5'
const TONE: Record<string, { bg: string; fg: string }> = {
  amber: { bg: '#FEF3C7', fg: '#92400E' }, blue: { bg: '#DBEAFE', fg: '#1E40AF' },
  green: { bg: '#DCFCE7', fg: '#166534' }, zinc: { bg: '#F4F4F5', fg: '#3F3F46' }, red: { bg: '#FEE2E2', fg: '#991B1B' },
}
const STATUS_TONE: Record<OrderStatus, keyof typeof TONE> = { new: 'amber', preparing: 'blue', ready: 'green', delivered: 'zinc', rejected: 'red' }

type Data = { status: OrderStatus; table_number: string; total: number }

export default function OrderStatusView({ slug, orderId, businessName, accent = '#F47B20' }: { slug: string; orderId: string; businessName: string; accent?: string }) {
  const [data, setData] = useState<Data | null | undefined>(undefined) // undefined = loading

  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const r = await fetch(`/api/order/${slug}?id=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (!stop) setData(j?.ok ? { status: j.status, table_number: j.table_number, total: Number(j.total) || 0 } : null)
      } catch { if (!stop) setData((d) => (d === undefined ? null : d)) }
    }
    load()
    const t = setInterval(load, 6000)
    return () => { stop = true; clearInterval(t) }
  }, [slug, orderId])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: BG, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {data === undefined ? (
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200" style={{ borderTopColor: accent }} aria-label="Chargement" />
      ) : data === null ? (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🔍</div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: INK }}>Commande introuvable</h1>
          <p className="mt-1 text-sm" style={{ color: MUT }}>Ce lien de suivi n’est plus valide.</p>
          <Link href={`/${slug}`} className="mt-6 rounded-2xl px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Voir le menu</Link>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🛎️</div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: MUT }}>{businessName}</p>
          <h1 className="mt-1 text-xl font-bold" style={{ color: INK }}>Votre commande</h1>
          <p className="mt-1 text-sm" style={{ color: MUT }}>Table {data.table_number}{data.total > 0 ? ` · ${money(data.total)}` : ''}</p>
          <div className="mt-5 rounded-full px-4 py-2 text-sm font-bold" role="status" aria-live="polite" style={{ backgroundColor: TONE[STATUS_TONE[data.status]].bg, color: TONE[STATUS_TONE[data.status]].fg }}>
            {ORDER_STATUS_CUSTOMER[data.status]}
          </div>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed" style={{ color: MUT }}>
            {isOrderActive(data.status) ? 'Le statut se met à jour automatiquement. Vous payez à votre table.' : 'Cette commande est terminée. Merci !'}
          </p>
          <Link href={`/${slug}`} className="mt-7 text-xs font-medium underline-offset-2 hover:underline" style={{ color: MUT }}>Retour au menu</Link>
        </>
      )}
    </div>
  )
}
