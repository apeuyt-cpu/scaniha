'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFEFE]">
      <div className="text-center max-w-sm px-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Une erreur est survenue</h2>
        <p className="text-zinc-600 mb-4">
          Quelque chose s&apos;est mal passé de notre côté. Veuillez réessayer dans un instant.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 mb-4">Référence&nbsp;: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

