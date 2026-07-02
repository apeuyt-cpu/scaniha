'use client'

import { useState } from 'react'

const CASINO_EMOJIS = [
  '🎰','🎲','🃏','🎯','🏆','💎','⭐','🌟',
  '🍒','🍋','🍀','🔔','7️⃣','👑','💰','💫',
  '🎁','🎉','🥂','☕','🍕','🍔','🍦','🧁',
  '🥇','🎫','🛍️','🎶','🌈','🔥','✨','💥',
  '🍾','🎊','🪙','💳','🏅','🎀','🍭','🎮',
]

export default function PrizeIconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (icon: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-2xl shadow-sm transition hover:border-amber-400 hover:shadow-md"
        title="Choisir une icône"
        aria-label="Choisir une icône pour ce lot"
      >
        {value || '🎁'}
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
        >
          <p className="mb-2 text-xs font-semibold text-zinc-500">Choisir une icône</p>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-1">
            {CASINO_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false) }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-amber-50 hover:scale-110 ${
                  value === e ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                }`}
                title={e}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Custom emoji input */}
          <div className="mt-2 flex gap-2 border-t border-zinc-100 pt-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Emoji perso"
              className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
              maxLength={4}
            />
            <button
              type="button"
              disabled={!custom.trim()}
              onClick={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(''); setOpen(false) } }}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-40"
            >
              OK
            </button>
          </div>

          {/* Clear icon */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className="mt-1.5 w-full rounded-lg py-1 text-xs text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
          >
            Retirer l'icône
          </button>
        </div>
      )}
    </div>
  )
}