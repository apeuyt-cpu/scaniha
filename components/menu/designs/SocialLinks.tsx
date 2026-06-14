'use client'

// Shared social-media access for the menu designs:
//  - SocialFab   : a small floating circular button that opens the popup
//  - SocialPopup : a bottom-sheet / centered popup listing the business socials
// Designs either drop a <SocialFab/> or trigger <SocialPopup/> from their own UI.

import { useId, useRef, useState } from 'react'
import { InteractiveStyles, useOverlayDismiss } from './interactive'

type Social = { label: string; url: string; color: string; icon: 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'web' }

/**
 * Normalize a stored social value into a usable link, or null to skip it.
 * Only renders a network the owner actually filled in with a real URL — free
 * text (e.g. "caffe ciao manzah 8") or blanks are dropped, and a schemeless
 * domain ("test.com") gets an https:// prefix so the link works.
 */
function socialUrl(v: any): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  // Must look like a URL: contains a dot-domain and no spaces. Otherwise it's
  // free text the owner typed, not a link.
  if (!t || /\s/.test(t) || !/[^.\s]\.[a-z]{2,}/i.test(t)) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

export function getSocials(business: any): Social[] {
  const wa = (business?.whatsapp_number || '').replace(/[^\d]/g, '')
  const ig = socialUrl(business?.instagram_url)
  const fb = socialUrl(business?.facebook_url)
  const tw = socialUrl(business?.twitter_url)
  const web = socialUrl(business?.website_url)
  return [
    ig && { label: 'Instagram', url: ig, color: '#E1306C', icon: 'instagram' as const },
    fb && { label: 'Facebook', url: fb, color: '#1877F2', icon: 'facebook' as const },
    tw && { label: 'X', url: tw, color: '#111111', icon: 'x' as const },
    wa.length >= 8 && { label: 'WhatsApp', url: `https://wa.me/${wa}`, color: '#25D366', icon: 'whatsapp' as const },
    web && { label: 'Site web', url: web, color: '#6B7280', icon: 'web' as const },
  ].filter(Boolean) as Social[]
}

function Glyph({ icon }: { icon: Social['icon'] }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'currentColor' }
  switch (icon) {
    case 'facebook':
      return <svg {...common}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    case 'instagram':
      return <svg {...common}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
    case 'x':
      return <svg {...common}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    case 'whatsapp':
      return <svg {...common}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
    default:
      return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
  }
}

export function SocialPopup({ business, accent = '#F47B20', open, onClose, font }: { business: any; accent?: string; open: boolean; onClose: () => void; font?: string }) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const socials = getSocials(business)
  useOverlayDismiss(open, onClose, dialogRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" style={{ fontFamily: font }}>
      <InteractiveStyles />
      <div className="sx-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="sx-modal relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-[28px] bg-white pb-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] outline-none">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h3 id={titleId} className="text-[18px] font-extrabold text-zinc-900">Suivez-nous</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 active:scale-90">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {socials.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-zinc-400">Aucun réseau social pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 px-6 pt-2">
            {socials.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: s.color }}>
                  <Glyph icon={s.icon} />
                </span>
                <span className="flex-1 text-[15px] font-bold text-zinc-900">{s.label}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDC6BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Floating circular button (bottom-left by default) that opens the social popup. */
export function SocialFab({ business, accent = '#F47B20', gradient, font, side = 'left' }: { business: any; accent?: string; gradient?: string; font?: string; side?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const socials = getSocials(business)
  if (socials.length === 0) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Réseaux sociaux"
        className={`fixed bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition hover:scale-105 active:scale-95 ${side === 'left' ? 'left-4' : 'right-4'}`}
        style={gradient ? { backgroundImage: gradient } : { backgroundColor: accent }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      </button>
      <SocialPopup business={business} accent={accent} open={open} onClose={() => setOpen(false)} font={font} />
    </>
  )
}
