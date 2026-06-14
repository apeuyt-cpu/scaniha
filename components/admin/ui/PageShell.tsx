'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n/LocaleContext'

const WIDTHS = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const

/**
 * The single shell for every admin sub-page. A slim sticky top bar holds an
 * always-visible "Retour" button (never scrolls out of reach) plus the page
 * title and an optional action. Mobile-first: one column, comfortable tap
 * targets, hairline borders. The Home hub (/admin) renders its own header.
 */
export default function PageShell({
  title,
  subtitle,
  backHref = '/admin',
  action,
  width = '2xl',
  children,
}: {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
  width?: keyof typeof WIDTHS
  children: React.ReactNode
}) {
  const { dir } = useLocale()
  const maxW = WIDTHS[width]

  return (
    <div className="admin-page min-h-screen bg-zinc-50" dir={dir}>
      {/* Sticky bar — always visible, no scrolling back up to leave the page. */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md">
        <div className={`mx-auto flex h-14 w-full ${maxW} items-center gap-3 px-4`}>
          <Link
            href={backHref}
            aria-label="Retour"
            className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white pe-3.5 ps-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-95"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition group-hover:-translate-x-0.5 rtl:rotate-180"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Retour
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-zinc-900">
            {title}
          </h1>

          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>

      <main className={`mx-auto w-full ${maxW} px-4 pb-16 pt-6 lg:pt-8`}>
        {subtitle && (
          <p className="-mt-1 mb-6 max-w-prose text-[15px] leading-relaxed text-zinc-500">
            {subtitle}
          </p>
        )}
        {children}
      </main>
    </div>
  )
}
