'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Logs admin / super-admin page visits to "Super Eyes" (one row per navigation,
 * deduped on consecutive same-path). Mounted in the admin + super-admin shells.
 */
export default function ActivityTracker() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === last.current) return
    last.current = pathname
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [pathname])

  return null
}
