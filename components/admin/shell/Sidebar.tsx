'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminNav, navItemActive } from './useAdminNav'
import { IconExternal, IconLogout } from './icons'

/**
 * Desktop sidebar (≥lg). Brand/business identity on top, the grouped nav model
 * in the middle (scrollable), and footer actions (view live menu + sign out).
 * Driven by the single `useAdminNav` model so it never drifts from the
 * mobile bottom-nav.
 */
export default function Sidebar({ business, capabilities }: { business: any; capabilities?: string[] | null }) {
  const pathname = usePathname()
  const nav = useAdminNav(business, capabilities)

  const signOut = async () => {
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/login'
  }

  const active = business.status === 'active'

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white lg:flex">
      {/* Identity */}
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-[var(--line)] bg-white object-contain p-1" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {String(business.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--ink)]">{business.name}</p>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-amber-500'}`} />
            {active ? 'En ligne' : 'En pause'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        {nav.groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
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
                      aria-current={on ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        on ? 'nav-active' : 'text-zinc-600 hover:bg-zinc-100 hover:text-[var(--ink)]'
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
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-[var(--line)] px-3 py-3">
        <a
          href={`/${business.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-[var(--ink)]"
        >
          <IconExternal width={18} height={18} />
          Voir le menu
        </a>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <IconLogout width={18} height={18} />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
