import Link from 'next/link'

/**
 * White hairline card (v2 kit). Same API as legacy ui/Card. Premium-light:
 * warm hairline border + soft layered shadow. Pass `href` to make the whole
 * card a navigation link; `interactive` adds hover lift for buttons/rows.
 */
export default function Card({
  href,
  interactive,
  className = '',
  children,
}: {
  href?: string
  interactive?: boolean
  className?: string
  children: React.ReactNode
}) {
  const base = `rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft ${
    interactive ? 'transition hover:-translate-y-0.5 hover:shadow-soft-lg active:translate-y-0' : ''
  } ${className}`
  if (href) {
    return (
      <Link href={href} className={`block ${base}`}>
        {children}
      </Link>
    )
  }
  return <div className={base}>{children}</div>
}

/**
 * Titled section panel — card with a header (title + optional hint + action)
 * and a body. The workhorse container for re-homed feature sections.
 */
export function Panel({
  title,
  hint,
  action,
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: React.ReactNode
  hint?: string
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-[var(--ink)]">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-[var(--muted)]">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
