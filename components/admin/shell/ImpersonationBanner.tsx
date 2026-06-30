'use client'

/**
 * Super-admin "Gérer comme l'établissement" banner. Fixed to the very bottom of
 * the viewport; the mobile bottom-nav sits directly above it (see AdminShell).
 * Extracted from the legacy AdminLayoutClient, behaviour unchanged.
 */
export default function ImpersonationBanner({ businessName }: { businessName: string }) {
  const exit = async () => {
    try { await fetch('/api/super-admin/impersonate', { method: 'DELETE' }) } catch {}
    window.location.href = '/super-admin/businesses'
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-orange-300 bg-[var(--brand)] text-white shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5" dir="ltr">
        <span className="min-w-0 truncate text-sm font-semibold">
          👁️ Vous gérez « {businessName} » en tant que super-admin
        </span>
        <button onClick={exit} className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold transition hover:bg-white/30">
          Quitter
        </button>
      </div>
    </div>
  )
}
