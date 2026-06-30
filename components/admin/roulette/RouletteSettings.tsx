'use client'

import { useEffect } from 'react'
import Button from '@/components/admin/kit/Button'
import { inputClass } from '@/components/admin/kit/Field'

export interface RoulettePrize {
  id: string
  label: string
  weight: number
  active: boolean
  position: number
}

/**
 * Settings popup for the admin roulette — the owner's "control everything"
 * panel: add/remove lots, rename them, and set each lot's chance with a slider
 * that auto-balances the rest so the total always stays at 100 %. Purely
 * presentational; all state + the odds maths live in the parent (AdminRoulette),
 * mirroring the customer odds editor in GameManager.
 */
export default function RouletteSettings({
  open,
  onClose,
  prizes,
  pctById,
  colorById,
  sliderMax,
  activeCount,
  onAdd,
  onLabelInput,
  onLabelBlur,
  onSetPct,
  onToggle,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  prizes: RoulettePrize[]
  pctById: Record<string, number>
  colorById: Record<string, string>
  sliderMax: number
  activeCount: number
  onAdd: () => void
  onLabelInput: (id: string, label: string) => void
  onLabelBlur: (id: string, label: string) => void
  onSetPct: (id: string, value: number) => void
  onToggle: (p: RoulettePrize) => void
  onDelete: (id: string) => void
}) {
  // Lock the page scroll + close on Escape while the popup is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const activeList = prizes.filter((p) => p.active)

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Réglages de la roue"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-zinc-900">Lots &amp; chances</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Réglez la chance de chaque lot — le total reste à 100&nbsp;%.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-zinc-700">{activeCount} lot{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}</span>
            <Button variant="neutral" onClick={onAdd} className="!min-h-0 shrink-0 px-3 py-2 text-xs">+ Lot</Button>
          </div>

          {/* Live odds bar */}
          {activeList.length > 0 && (
            <div className="mt-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                {activeList.map((p) => (
                  <div
                    key={p.id}
                    className="h-full transition-[width] duration-150"
                    style={{ width: `${pctById[p.id] || 0}%`, backgroundColor: colorById[p.id], boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.65)' }}
                    title={`${p.label || 'Lot'} · ${pctById[p.id] || 0}%`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {prizes.map((p) => (
              <div key={p.id} className={`rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 ${p.active ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: p.active ? colorById[p.id] : '#D4D4D8' }}
                    aria-hidden="true"
                  />
                  <input
                    value={p.label}
                    onChange={(e) => onLabelInput(p.id, e.target.value)}
                    onBlur={(e) => onLabelBlur(p.id, e.target.value)}
                    className={`${inputClass} min-w-0 flex-1`}
                    placeholder="Nom du lot"
                  />
                  <button
                    type="button"
                    onClick={() => onToggle(p)}
                    aria-pressed={p.active}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}
                  >
                    {p.active ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    aria-label="Supprimer le lot"
                    title="Supprimer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
                {p.active ? (
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={sliderMax}
                      step={1}
                      value={pctById[p.id] ?? 0}
                      disabled={activeList.length <= 1}
                      onChange={(e) => onSetPct(p.id, Number(e.target.value))}
                      aria-label={`Chance de gagner « ${p.label || 'lot'} »`}
                      className="h-6 flex-1 cursor-pointer accent-orange-500 disabled:cursor-default disabled:opacity-50"
                    />
                    <span className="w-12 shrink-0 text-right text-base font-bold tabular-nums" style={{ color: colorById[p.id] }}>
                      {pctById[p.id] ?? 0}%
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-zinc-400">Désactivé — n&apos;apparaît pas sur la roue.</p>
                )}
              </div>
            ))}
            {prizes.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucun lot — ajoutez-en au moins deux.</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-5 py-3">
          <Button variant="primary" onClick={onClose} className="w-full">Terminé</Button>
        </div>
      </div>
    </div>
  )
}
