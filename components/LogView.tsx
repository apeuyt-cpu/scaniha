'use client'

import { useEffect } from 'react'

interface LogViewProps {
  businessId: string
  slug: string
}

export default function LogView({ businessId, slug }: LogViewProps) {
  useEffect(() => {
    const key = `viewed_${slug}`
    const last = localStorage.getItem(key)
    if (last) {
      const elapsed = Date.now() - parseInt(last)
      if (elapsed < 30 * 60 * 1000) return
    }

    localStorage.setItem(key, Date.now().toString())

    fetch('/api/log-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, slug }),
    }).catch(() => {})
  }, [businessId, slug])

  return null
}
