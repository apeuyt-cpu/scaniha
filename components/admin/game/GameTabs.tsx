'use client'

import { useEffect, useState } from 'react'
import GameManager from '@/components/admin/GameManager'
import LoyaltyManager from '@/components/admin/LoyaltyManager'
import FidelityToggle from '@/components/admin/game/FidelityToggle'

/** Fetches the owner's business, then shows Roue / Fidélité config in tabs. */
export default function GameTabs() {
  const [business, setBusiness] = useState<{ id: string; slug: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'roue' | 'fidelite'>('roue')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/business')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          setBusiness(await res.json())
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
  }
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>

  return (
    <div className="space-y-4">
      {/* Master switch: QR menu only ↔ QR menu + fidelity. */}
      <FidelityToggle businessId={business.id} />

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1">
        <TabBtn active={tab === 'roue'} onClick={() => setTab('roue')} icon={<IconWheel />}>Roue</TabBtn>
        <TabBtn active={tab === 'fidelite'} onClick={() => setTab('fidelite')} icon={<IconStar />}>Fidélité</TabBtn>
      </div>
      {tab === 'roue' ? (
        <GameManager businessId={business.id} slug={business.slug} />
      ) : (
        <LoyaltyManager businessId={business.id} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-white text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

const IconWheel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </svg>
)
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" />
  </svg>
)
