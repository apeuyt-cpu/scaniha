'use client'

import { useState, useEffect } from 'react'
import SettingsManager from '@/components/admin/SettingsManager'
import PageShell from '@/components/admin/ui/PageShell'

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  wheel_enabled: boolean
  wheel_visible: boolean
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

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
        <SettingsManager business={business} onUpdate={fetchBusiness} />
      </div>
    </PageShell>
  )
}
