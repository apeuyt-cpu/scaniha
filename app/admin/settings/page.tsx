'use client'

import { useState, useEffect } from 'react'
import SettingsManager from '@/components/admin/SettingsManager'
import PageShell from '@/components/admin/ui/PageShell'
import Spinner from '@/components/admin/ui/Spinner'
import { resolveMode } from '@/lib/design-settings'

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  wheel_enabled: boolean
  wheel_visible: boolean
  design_settings?: any
  plan?: string | null
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        setBusiness(await res.json())
      } else if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
      }
    } catch (err) {
      console.error('Error fetching business:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusiness()
  }, [])

  if (loading) return <Spinner />

  if (!business) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-zinc-500">Aucun établissement trouvé</p>
      </div>
    )
  }

  return (
    <PageShell
      title="Réglages"
      subtitle="Gérez les informations et l'identité de votre établissement."
      width="3xl"
    >
      <div className="space-y-5">
        {(() => {
          const mode = resolveMode(business)
          const label = mode === 'menu' ? 'Menu QR' : mode === 'fidelity' ? 'Programme fidélité' : 'Les deux (menu + fidélité)'
          return (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-900">Votre formule</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600">{label}</div>
              <p className="mt-3 text-xs text-zinc-500">Pour changer de formule, contactez Scaniha.</p>
            </div>
          )
        })()}
        <SettingsManager business={business} onUpdate={fetchBusiness} />
      </div>
    </PageShell>
  )
}
