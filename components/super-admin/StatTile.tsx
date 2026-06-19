/**
 * Premium KPI tile for the super-admin — a bold tabular number with a tone
 * accent bar, so a glance at the row reads "what's healthy / what needs me".
 * Purely presentational (no hooks) → safe in both server and client trees.
 */
export type StatTone = 'zinc' | 'green' | 'amber' | 'red' | 'orange'

const NUMBER: Record<StatTone, string> = {
  zinc: 'text-zinc-900',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  orange: 'text-orange-600',
}

const BAR: Record<StatTone, string> = {
  zinc: 'bg-zinc-300',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
}

export default function StatTile({
  label,
  value,
  tone = 'zinc',
  hint,
  active = false,
  onClick,
}: {
  label: string
  value: React.ReactNode
  tone?: StatTone
  hint?: string
  /** When true, draws a stronger ring (e.g. the currently-filtered metric). */
  active?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`group relative w-full overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
        active ? 'border-orange-300 ring-2 ring-orange-200' : 'border-zinc-200/80'
      } ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${BAR[tone]}`} aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tabular-nums leading-none ${NUMBER[tone]}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[11px] leading-tight text-zinc-400">{hint}</p>}
    </Comp>
  )
}
