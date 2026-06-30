'use client'

import { useEffect, useState } from 'react'

// Cosmetic launch-offer urgency: each DEVICE gets its own 22-hour window stored
// in localStorage. When it runs out it silently restarts — it's "just for show",
// not a real deadline, so the page always shows a live ticking countdown.
const KEY = 'scaniha_offer_deadline'
const WINDOW_MS = 22 * 60 * 60 * 1000 // 22 h

/** Current deadline for this device; (re)created when missing or already passed. */
function deadline(): number {
  try {
    const t = parseInt(localStorage.getItem(KEY) || '', 10)
    if (Number.isFinite(t) && t > Date.now()) return t
  } catch {}
  const t = Date.now() + WINDOW_MS
  try { localStorage.setItem(KEY, String(t)) } catch {}
  return t
}

function Box({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="grid min-w-[2.6rem] place-items-center rounded-xl bg-zinc-900 px-2 py-1.5 font-mono text-2xl font-extrabold tabular-nums text-white shadow-sm">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
    </div>
  )
}

export default function OfferCountdown() {
  // Mounted gate avoids an SSR/client hydration mismatch (the deadline only
  // exists client-side). Until mounted we render nothing.
  const [mounted, setMounted] = useState(false)
  const [remaining, setRemaining] = useState(WINDOW_MS)

  useEffect(() => {
    setMounted(true)
    const tick = () => setRemaining(Math.max(0, deadline() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  const total = Math.floor(remaining / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = pad(Math.floor(total / 3600))
  const m = pad(Math.floor((total % 3600) / 60))
  const s = pad(total % 60)

  return (
    <div className="mx-auto mb-12 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50 to-amber-50 px-6 py-5 text-center shadow-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600 ring-1 ring-orange-200">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
        Offre de lancement
      </span>
      <div className="flex items-center gap-2" role="timer" aria-live="off" aria-label={`Offre se terminant dans ${h} heures ${m} minutes ${s} secondes`}>
        <Box value={h} label="heures" />
        <span className="-mt-4 text-2xl font-extrabold text-zinc-300">:</span>
        <Box value={m} label="min" />
        <span className="-mt-4 text-2xl font-extrabold text-zinc-300">:</span>
        <Box value={s} label="sec" />
      </div>
      <p className="text-xs font-medium text-zinc-500">Tarifs réduits — profitez-en avant la fin du compte à rebours.</p>
    </div>
  )
}
