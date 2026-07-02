'use client'

import { useState } from 'react'

const FOOD_EMOJIS = [
  '🍕','🍔','🍟','🌮','🍣','🍜','🍦','🎂',
  '🥗','🥩','🍗','🍩','🧁','🥤','☕','🧀',
  '🍰','🍪','🍫','🍬','🍭','🍮','🍯','🍿',
  '🥐','🥑','🥒','🥓','🥖','🥘','🥙','🥚',
]

const CASINO_EMOJIS = [
  '🎰','🎲','🃏','🎯','🏆','💎','⭐','🌟',
  '🔔','7️⃣','👑','💰','💫','🎁','🎉','🥇',
  '🎫','🎶','🌈','🔥','✨','💥','🪙','💳',
]

export default function PrizeIconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (icon: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'food'|'casino'>('food')
  const [custom, setCustom] = useState('')

  const icons = tab === 'food' ? FOOD_EMOJIS : CASINO_EMOJIS

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-2xl shadow-sm transition hover:border-amber-400 hover:shadow-md active:scale-95"
        title="Choisir une icône"
        aria-label="Choisir une icône pour ce lot"
      >
        {value || '🎁'}
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 z-50 w-76 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: 280 }}
        >
          {/* Tab switcher */}
          <div className="mb-2 flex gap-1 rounded-xl bg-zinc-100 p-1">
            {(['food','casino'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
              >
                {t === 'food' ? '🍕 Nourriture' : '🎰 Casino'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-1">
            {icons.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false) }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-amber-50 hover:scale-110 active:scale-95 ${
                  value === e ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-2 border-t border-zinc-100 pt-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Emoji perso..."
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

          <div className="mt-1 flex justify-between">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full rounded-lg py-1 text-xs text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
            >
              Retirer l'icône
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
