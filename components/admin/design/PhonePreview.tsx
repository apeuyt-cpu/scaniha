'use client'

import { resolveAccent, resolveGradient, type DesignId, type DesignSettings } from '@/lib/design-settings'

/**
 * A small phone mock-up that mirrors how the owner's accent / gradient / name /
 * logo look on the live menu. Reads the IN-PROGRESS settings so it updates as
 * the owner edits colours in the "Couleurs & dégradé" tab — no save needed.
 */
export default function PhonePreview({
  settings,
  designId,
  businessName,
  logoUrl,
}: {
  settings: DesignSettings
  designId: DesignId
  businessName: string
  logoUrl?: string | null
}) {
  const gradient = resolveGradient(settings, designId)
  const accent = resolveAccent(settings, designId)
  const showLogo = settings.showLogo && Boolean(logoUrl)

  const rows = [
    { name: 'Plat signature', price: '24' },
    { name: 'Spécialité du chef', price: '18' },
    { name: 'Dessert maison', price: '9' },
  ]

  return (
    <div aria-hidden="true" className="select-none">
      {/* Phone frame */}
      <div className="mx-auto w-[190px] overflow-hidden rounded-[2rem] border-[6px] border-zinc-900 bg-white shadow-xl">
        {/* Header bar with the resolved gradient */}
        <div className="relative px-3 pb-4 pt-5 text-white" style={{ background: gradient }}>
          <div className="flex items-center gap-2">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl as string}
                alt=""
                className="h-7 w-7 rounded-full bg-white/90 object-cover ring-1 ring-white/40"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                {(businessName || 'S').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-bold drop-shadow-sm">{businessName || 'Votre établissement'}</span>
          </div>
          {settings.tagline ? (
            <p className="mt-1.5 truncate text-[10px] text-white/90">{settings.tagline}</p>
          ) : null}
        </div>

        {/* Menu rows */}
        <div className="space-y-2 bg-zinc-50 p-3">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm">
              <span className="h-8 w-8 shrink-0 rounded-lg opacity-90" style={{ background: gradient }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-zinc-800">{r.name}</div>
                <div className="mt-1 h-1.5 w-10 rounded-full bg-zinc-100" />
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: accent }}
              >
                {r.price} TND
              </span>
            </div>
          ))}
        </div>

        {/* Floating dock button */}
        <div className="relative h-12 bg-zinc-50">
          <span
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg"
            style={{ background: gradient }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 4.8L18.7 9.7 13.9 11.6 12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3z" />
              <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14z" />
            </svg>
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-400">Aperçu en direct</p>
    </div>
  )
}
