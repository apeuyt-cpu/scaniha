'use client'

import Button from '@/components/admin/ui/Button'

/**
 * Friendly empty-state shown before the game / loyalty feature is set up.
 * No SQL, no developer internals — just a clear French call to action. If the
 * backend can't provision the feature yet, the parent surfaces a clear message
 * via `error` and the owner can simply retry.
 */
export default function SetupCard({
  icon,
  title,
  description,
  cta,
  onActivate,
  busy,
  error,
}: {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  onActivate: () => void
  busy?: boolean
  error?: string | null
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{description}</p>
      <Button variant="primary" onClick={onActivate} disabled={busy} className="mx-auto mt-5">
        {busy ? 'Activation…' : cta}
      </Button>
      {error && (
        <p className="mx-auto mt-4 max-w-md rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {error}
        </p>
      )}
    </div>
  )
}
