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
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 lg:px-6">
        <span className="flex shrink-0 items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">S</span>
          <span className="hidden sm:inline">Super-admin</span>
        </span>

        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = isActive(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
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
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {out ? '…' : 'Déconnexion'}
        </button>
      </div>
    </header>
  )
}
