'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminNav, navItemActive } from './useAdminNav'
import { IconExternal, IconLogout } from './icons'

/**
 * Mobile "Plus" sheet (<lg). Holds the FULL grouped nav (so every section is
 * reachable even when it's not one of the 4 bottom-nav primaries) + view-menu
 * and sign-out. Slides up from the bottom; tap the scrim or a link to close.
 */
export default function MoreSheet({
  open,
  onClose,
  business,
  capabilities,
}: {
  open: boolean
  onClose: () => void
  business: any
  capabilities?: string[] | null
}) {
  const pathname = usePathname()
  const nav = useAdminNav(business, capabilities)

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const signOut = async () => {
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-black/40 animate-[adminFadeIn_.15s_ease-out]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-[var(--line)] bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft-lg animate-[adminSheetIn_.22s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-3.5">
          <p className="text-sm font-bold text-[var(--ink)]">Tout le tableau de bord</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="px-3 py-3" aria-label="Toutes les sections">
          {nav.groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.title && (
                <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{group.title}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const on = navItemActive(item.href, pathname)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={on ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                          on ? 'nav-active' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <span className="shrink-0">{item.icon({ width: 20, height: 20 })}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <div className="mt-4 space-y-0.5 border-t border-[var(--line)] pt-3">
            <a
              href={`/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <IconExternal width={20} height={20} />
              Voir le menu
            </a>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <IconLogout width={20} height={20} />
              Se déconnecter
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
