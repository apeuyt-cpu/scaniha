'use client'

import { useEffect } from 'react'

/**
 * When the menu is opened from the café QR (`/{slug}?s=<key>`), POST the key to
 * mint the short-lived scan cookie that unlocks the wheel, then strip `s` from
 * the address bar so the secret isn't bookmarked or shared. No-op without `?s=`.
 * Renders nothing.
 */
export default function QrScanMint({ slug }: { slug: string }) {
  useEffect(() => {
    let key: string | null = null
    try {
      key = new URLSearchParams(window.location.search).get('s')
    } catch {}
    if (!key) return

    fetch(`/api/game/${slug}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).catch(() => {})

    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('s')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    } catch {}
  }, [slug])

  return null
}
