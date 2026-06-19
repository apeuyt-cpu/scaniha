/**
 * Shared loading skeletons for admin/super-admin surfaces — replace bare
 * "Chargement…" text so data fades in place instead of popping/shifting.
 * `Skeleton` is a single shimmering block; `CardSkeleton` mimics the standard
 * admin card (title + subtitle + a few rows) for the common `if (loading)` case.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`} aria-hidden="true" />
}

export function CardSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-6 ${className}`} aria-busy="true" aria-label="Chargement…">
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
