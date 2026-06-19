'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { href: '/super-admin', label: 'Aperçu' },
  { href: '/super-admin/activity', label: 'Activité' },
  { href: '/super-admin/businesses', label: 'Comptes' },
  { href: '/super-admin/payments', label: 'Paiements', badge: true },
  { href: '/super-admin/devis', label: 'Devis' },
  { href: '/super-admin/analytics', label: 'Stats' },
]

/** Slim, clean tabbed top bar for the platform operator. */
export default function SuperAdminShell({ email, pendingCount = 0 }: { email?: string | null; pendingCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [out, setOut] = useState(false)

  const isActive = (href: string) => (href === '/super-admin' ? pathname === '/super-admin' : pathname.startsWith(href))

  const signOut = async () => {
    setOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 lg:px-6">
        <span className="flex shrink-0 items-center gap-2.5 font-semibold text-zinc-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white shadow-sm shadow-orange-500/30">S</span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold">Scaniha</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">Super-admin</span>
          </span>
        </span>

        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = isActive(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`relative whitespace-nowrap rounded-xl px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-orange-50 font-semibold text-orange-700 ring-1 ring-orange-200'
                    : 'font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {t.label}
                {t.badge && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {email && <span className="hidden max-w-[160px] truncate text-xs text-zinc-400 md:block">{email}</span>}
        <button
          type="button"
          onClick={signOut}
          disabled={out}
          className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {out ? '…' : 'Déconnexion'}
        </button>
      </div>
    </header>
  )
}
