'use client'

import { useEffect, useState } from 'react'

export interface OwnerBusiness { id: string; slug: string }

/** Fetch the authenticated owner's business (id + slug) for admin sub-pages. */
export function useOwnerBusiness() {
  const [business, setBusiness] = useState<OwnerBusiness | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/business')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const b = await res.json()
          if (!cancelled) setBusiness({ id: b.id, slug: b.slug })
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
  return { business, loading }
}
