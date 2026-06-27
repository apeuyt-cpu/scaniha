'use client'

import { IconExternal } from './icons'

/**
 * Mobile top bar (<lg). Shows the business identity + a quick "view live menu"
 * link. Navigation itself lives in the bottom-nav; this bar is just context.
 */
export default function TopBar({ business }: { business: any }) {
  const active = business.status === 'active'
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-xl border border-[var(--line)] bg-white object-contain p-1" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {String(business.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--ink)]">{business.name}</p>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-amber-500'}`} />
            {active ? 'En ligne' : 'En pause'}
          </span>
        </div>
      </div>
      <a
        href={`/${business.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Voir le menu"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-semibold text-zinc-700 shadow-soft transition hover:bg-zinc-50"
      >
        <IconExternal width={15} height={15} />
        Voir
      </a>
    </header>
  )
}
