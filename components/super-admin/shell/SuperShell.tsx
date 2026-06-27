'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSuperNav, navItemActive, type SuperNavItem } from './useSuperNav'
import { IconMore, IconLogout } from './icons'

/**
 * Super-admin v2 shell — premium-light sidebar (≥lg) + mobile top-bar/bottom-nav,
 * matching the owner admin. Wraps the routed page. Reuses the global kit tokens
 * (.admin-shell canvas, var(--brand), shadow-soft, nav-active).
 */
export default function SuperShell({
  email, pendingCount = 0, requestsCount = 0, children,
}: { email?: string | null; pendingCount?: number; requestsCount?: number; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { groups, primaries } = useSuperNav()
  const [moreOpen, setMoreOpen] = useState(false)
  const [out, setOut] = useState(false)

  const badgeFor = (it: SuperNavItem) =>
    it.badge === 'requests' ? requestsCount : it.badge === 'payments' ? pendingCount : 0

  const signOut = async () => {
    setOut(true)
    try { await createClient().auth.signOut() } catch {}
    router.push('/login'); router.refresh()
  }

  const Brand = (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white shadow-soft">S</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight text-[var(--ink)]">Scaniha</span>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--brand-600)]">Super-admin</span>
      </span>
    </div>
  )

  return (
    <div className="admin-shell min-h-screen lg:flex" dir="ltr">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white lg:flex">
        <div className="border-b border-[var(--line)] px-4 py-4">{Brand}</div>
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation super-admin">
          {groups.map((g, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {g.title && <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = navItemActive(it.href, pathname); const b = badgeFor(it)
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={on ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on ? 'nav-active' : 'text-zinc-600 hover:bg-zinc-100 hover:text-[var(--ink)]'}`}>
                        <span className="shrink-0">{it.icon({ width: 20, height: 20 })}</span>
                        <span className="flex-1 truncate">{it.label}</span>
                        {b > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-[11px] font-bold text-white">{b}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-[var(--line)] px-3 py-3">
          {email && <p className="truncate px-3 pb-1 text-[11px] text-zinc-400">{email}</p>}
          <button onClick={signOut} disabled={out} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
            <IconLogout width={18} height={18} /> {out ? '…' : 'Déconnexion'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
          {Brand}
          {email && <span className="max-w-[140px] truncate text-xs text-zinc-400">{email}</span>}
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 lg:py-8 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom-nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-white/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Navigation">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {primaries.map((it) => {
            const on = navItemActive(it.href, pathname); const b = badgeFor(it)
            return (
              <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${on ? 'text-[var(--brand-600)]' : 'text-zinc-500'}`}>
                <span className="flex h-6 items-center justify-center">{it.icon({ width: 22, height: 22 })}</span>
                <span className="max-w-full truncate px-1">{it.label}</span>
                {b > 0 && <span className="absolute right-[18%] top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">{b}</span>}
              </Link>
            )
          })}
          <button onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${moreOpen ? 'text-[var(--brand-600)]' : 'text-zinc-500'}`}>
            <span className="flex h-6 items-center justify-center"><IconMore width={22} height={22} /></span>
            <span>Plus</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 animate-[adminFadeIn_.15s_ease-out]" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-[var(--line)] bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft-lg animate-[adminSheetIn_.22s_cubic-bezier(0.22,1,0.36,1)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-3.5">
              <p className="text-sm font-bold text-[var(--ink)]">Tout le super-admin</p>
              <button onClick={() => setMoreOpen(false)} aria-label="Fermer" className="-mr-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="px-3 py-3">
              {groups.map((g, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                  {g.title && <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{g.title}</p>}
                  <ul className="space-y-0.5">
                    {g.items.map((it) => {
                      const on = navItemActive(it.href, pathname); const b = badgeFor(it)
                      return (
                        <li key={it.href}>
                          <Link href={it.href} onClick={() => setMoreOpen(false)} aria-current={on ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${on ? 'nav-active' : 'text-zinc-700 hover:bg-zinc-100'}`}>
                            <span className="shrink-0">{it.icon({ width: 20, height: 20 })}</span>
                            <span className="flex-1 truncate">{it.label}</span>
                            {b > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-[11px] font-bold text-white">{b}</span>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <button onClick={signOut} disabled={out} className="mt-4 flex w-full items-center gap-3 rounded-xl border-t border-[var(--line)] px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                <IconLogout width={20} height={20} /> Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
