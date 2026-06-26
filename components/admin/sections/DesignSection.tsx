'use client'

import { useEffect, useState } from 'react'
import DesignStudio from '@/components/admin/DesignStudio'
import PageHeader from '@/components/admin/kit/PageHeader'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import { IconBrush } from '@/components/admin/shell/icons'

/**
 * Re-homed "Design & marque" section (was /admin/theme): header + the existing
 * DesignStudio (brand + menu appearance). Fetches the full business client-side
 * so it can live in the shared shell without a server round-trip per tree.
 */
export default function DesignSection() {
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/business')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          if (!cancelled) setBusiness(await res.json())
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Design & marque" subtitle="Votre marque et l'apparence de votre menu." icon={<IconBrush width={20} height={20} />} />
      {loading ? <CardSkeleton rows={4} /> : business ? (
        <DesignStudio business={business} />
      ) : (
        <p className="text-[var(--muted)]">Établissement introuvable.</p>
      )}
    </div>
  )
}
