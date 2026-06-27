'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminNav, navItemActive } from './useAdminNav'
import { IconMore } from './icons'

/**
 * Mobile bottom-nav (<lg). 4 plan-aware primaries from the shared nav model +
 * a "Plus" button that opens the MoreSheet (full nav). Sits above the
 * impersonation banner when a super-admin is managing a café.
 */
export default function BottomNav({
  business,
  capabilities,
  impersonating,
  onMore,
  moreOpen,
}: {
  business: any
  capabilities?: string[] | null
  impersonating?: boolean
  onMore: () => void
  moreOpen?: boolean
}) {
  const pathname = usePathname()
  const { primaries } = useAdminNav(business, capabilities)

  // "Plus" is highlighted when we're in a section that isn't one of the primaries.
  const onPrimary = primaries.some((p) => navItemActive(p.href, pathname))

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 z-50 border-t border-[var(--line)] bg-white/95 backdrop-blur-md lg:hidden"
      style={{ bottom: impersonating ? 46 : 0, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5">
        {primaries.map((item) => {
          const on = navItemActive(item.href, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
                on ? 'text-[var(--brand-600)]' : 'text-zinc-500'
              }`}
            >
              <span className={`flex h-6 items-center justify-center ${on ? '' : 'opacity-80'}`}>
                {item.icon({ width: 22, height: 22 })}
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
            moreOpen || !onPrimary ? 'text-[var(--brand-600)]' : 'text-zinc-500'
          }`}
        >
          <span className="flex h-6 items-center justify-center">
            <IconMore width={22} height={22} />
          </span>
          <span>Plus</span>
        </button>
      </div>
    </nav>
  )
}
