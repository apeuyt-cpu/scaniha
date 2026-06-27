import Link from 'next/link'

/**
 * Empty / not-activated state (v2 kit). A centered icon + title + message and
 * an optional primary CTA. Used by gated sections (e.g. ordering off) and
 * zero-data lists.
 */
export default function EmptyState({
  icon,
  title,
  message,
  ctaLabel,
  ctaHref,
  onCta,
}: {
  icon?: React.ReactNode
  title: string
  message?: string
  ctaLabel?: string
  ctaHref?: string
  onCta?: () => void
}) {
  const cta = ctaLabel
    ? ctaHref
      ? (
          <Link
            href={ctaHref}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-[var(--brand-600)]"
          >
            {ctaLabel}
          </Link>
        )
      : (
          <button
            type="button"
            onClick={onCta}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-[var(--brand-600)]"
          >
            {ctaLabel}
          </button>
        )
    : null

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-soft">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-600)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
      {message && <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--muted)]">{message}</p>}
      {cta}
    </div>
  )
}
