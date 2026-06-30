'use client'

// Dismissible promo/announcement bar shown at the very top of the public menu.
// Dismissal is keyed by the message text, so editing the promo re-shows it even
// if a previous one was dismissed. Scrolls with the page (no sticky conflict with
// the designs' own sticky category navs).

import { useEffect, useState } from 'react'

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return String(h >>> 0)
}

export default function PromoBanner({ slug, message, emoji, accent = '#F47B20' }: { slug: string; message: string; emoji?: string; accent?: string }) {
  const [hidden, setHidden] = useState(true) // start hidden → no flash before the localStorage check
  const key = hash(message)

  useEffect(() => {
    try { setHidden(localStorage.getItem('scaniha_promo_' + slug) === key) } catch { setHidden(false) }
  }, [slug, key])

  if (hidden) return null

  return (
    <div className="relative flex items-center justify-center gap-2 px-10 py-2.5 text-center text-[13.5px] font-semibold leading-snug text-white" style={{ backgroundColor: accent }}>
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span>{message}</span>
      <button
        type="button"
        onClick={() => { try { localStorage.setItem('scaniha_promo_' + slug, key) } catch {}; setHidden(true) }}
        aria-label="Fermer l’annonce"
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/85 transition hover:bg-white/20"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  )
}
