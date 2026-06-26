'use client'

import { useState, useEffect } from 'react'
import SettingsManager from '@/components/admin/SettingsManager'
import PageHeader from '@/components/admin/kit/PageHeader'
import Spinner from '@/components/admin/kit/Spinner'
import { IconGear } from '@/components/admin/shell/icons'
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

/** Re-homed Réglages section (was /admin/settings): plan card + SettingsManager. */
export default function ReglagesSection() {
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

  useEffect(() => { fetchBusiness() }, [])

  if (loading) return <Spinner />
  if (!business) return <p className="text-[var(--muted)]">Aucun établissement trouvé.</p>

  const mode = resolveMode(business)
  const label = mode === 'menu' ? 'Menu QR' : mode === 'fidelity' ? 'Programme fidélité' : 'Les deux (menu + fidélité)'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Réglages" subtitle="Les informations et l'identité de votre établissement." icon={<IconGear width={20} height={20} />} />
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-[var(--ink)]">Votre formule</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-sm font-bold text-[var(--brand-600)]">{label}</div>
        <p className="mt-3 text-xs text-[var(--muted)]">Pour changer de formule, contactez Scaniha.</p>
      </div>
      <SettingsManager business={business} onUpdate={fetchBusiness} />
    </div>
  )
}
