/**
 * Loading skeletons (v2 kit). Same exports as legacy ui/Skeleton —
 * `Skeleton` (single shimmer block) + `CardSkeleton` (title + rows) — so the
 * common `if (loading)` branches in re-homed components keep working.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`} aria-hidden="true" />
}

export function CardSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft ${className}`} aria-busy="true" aria-label="Chargement…">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-2.5 h-3.5 w-64 max-w-[90%]" />
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
