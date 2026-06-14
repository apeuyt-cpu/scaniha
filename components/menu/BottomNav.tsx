'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Fixed bottom navigation for the public menu: Menu · Profil.
 * "Profil" is a real page (/[slug]/profil) — the diner's account/loyalty hub —
 * NOT a popup. Themed with the business accent on the active tab.
 *
 * Renders a same-height spacer first so page content always clears the bar.
 */
export default function BottomNav({ slug, accent = '#F47B20', active }: { slug: string; accent?: string; active?: 'menu' | 'profile' }) {
  const pathname = usePathname() || ''
  const onProfile = active ? active === 'profile' : pathname.startsWith(`/${slug}/profil`)
  const tabs = [
    { key: 'menu', href: `/${slug}`, label: 'Menu', active: !onProfile, icon: <IconMenu /> },
    { key: 'profile', href: `/${slug}/profil`, label: 'Profil', active: onProfile, icon: <IconUser /> },
  ]
  return (
    <>
      <div className="h-[68px]" aria-hidden="true" />
      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-black/[0.07] bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -10px 28px -18px rgba(0,0,0,0.3)' }}
      >
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 transition active:scale-95"
            >
              <span style={{ color: t.active ? accent : '#9A9186' }}>{t.icon}</span>
              <span className="text-[11px] font-bold" style={{ color: t.active ? '#15110C' : '#9A9186' }}>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
