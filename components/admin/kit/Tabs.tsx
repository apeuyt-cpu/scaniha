'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface TabDef {
  id: string
  label: string
  badge?: React.ReactNode
}

/**
 * URL-synced tab state — the consolidation primitive. Keeps the active tab in
 * the `?tab=` query param so tabs are deep-linkable and the legacy-route
 * redirect shims can land on a specific tab (e.g. `/admin/fidelite?tab=roue`).
 *
 * es5-safe: rebuilds the query from `toString()` (no iterator spread).
 */
export function useTabParam(tabIds: string[], fallback?: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const param = searchParams.get('tab')
  const active = param && tabIds.indexOf(param) !== -1 ? param : fallback ?? tabIds[0]

  const setActive = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', id)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return [active, setActive] as const
}

/**
 * Segmented tab bar (v2 kit). Controlled: pass `value` + `onChange` (typically
 * wired to `useTabParam`). Horizontally scrollable on mobile.
 */
export default function Tabs({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: TabDef[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={`no-scrollbar -mx-1 overflow-x-auto px-1 ${className}`}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex min-w-full gap-1 rounded-2xl border border-[var(--line)] bg-zinc-50 p-1 sm:min-w-0"
      >
        {tabs.map((tab) => {
          const selected = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-white text-[var(--ink)] shadow-soft'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
              {tab.badge != null && (
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    selected ? 'bg-[var(--brand-soft)] text-[var(--brand-600)]' : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
