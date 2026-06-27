import Link from 'next/link'

/**
 * KPI card (v2 kit). Same core API as legacy ui/StatCard (label + value + hint)
 * with optional `icon`, `tone`, and `href` so the dashboard can present live
 * metrics as tappable tiles. Premium-light surface + soft shadow.
 */
const TONES = {
  brand: 'text-[var(--brand-600)] bg-[var(--brand-soft)]',
  neutral: 'text-zinc-600 bg-zinc-100',
  green: 'text-green-700 bg-green-50',
  amber: 'text-amber-700 bg-amber-50',
  red: 'text-red-700 bg-red-50',
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  href,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: React.ReactNode
  tone?: keyof typeof TONES
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--ink)]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
    </>
  )
  const base = 'rounded-2xl border border-[var(--line)] bg-white p-4 shadow-soft'
  if (href) {
    return (
      <Link href={href} className={`block transition hover:-translate-y-0.5 hover:shadow-soft-lg ${base}`}>
        {inner}
      </Link>
    )
  }
  return <div className={base}>{inner}</div>
}
