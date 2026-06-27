'use client'

import { DESIGN_ACCENTS, type DesignId } from '@/lib/design-settings'
import type { DesignSettingsController } from '@/components/admin/DesignSettings'
import { Field } from '@/components/admin/DesignSettings'

const FLAT_PRESETS = ['#F47B20', '#E24B4A', '#1D9E75', '#378ADD', '#7F77DD', '#D4537E', '#0F6E56', '#1C1917']

const GRADIENTS: { name: string; from: string; to: string; angle: number }[] = [
  { name: 'Mangue', from: '#F47B20', to: '#F5B82E', angle: 135 },
  { name: 'Coucher', from: '#FF6B6B', to: '#FFD93D', angle: 120 },
  { name: 'Flamme', from: '#F12711', to: '#F5AF19', angle: 135 },
  { name: 'Corail', from: '#F857A6', to: '#FF5858', angle: 135 },
  { name: 'Océan', from: '#2193B0', to: '#6DD5ED', angle: 135 },
  { name: 'Menthe', from: '#00B09B', to: '#96C93D', angle: 135 },
  { name: 'Forêt', from: '#11998E', to: '#38EF7D', angle: 135 },
  { name: 'Myrtille', from: '#8E2DE2', to: '#4A00E0', angle: 135 },
  { name: 'Lavande', from: '#A18CD1', to: '#FBC2EB', angle: 135 },
  { name: 'Or rose', from: '#EE9CA7', to: '#F6C5CC', angle: 120 },
  { name: 'Café', from: '#B79891', to: '#94716B', angle: 135 },
  { name: 'Nuit', from: '#232526', to: '#414345', angle: 135 },
]

/**
 * "Couleurs & dégradé" tab. A single exclusive choice: a FLAT accent colour OR a
 * gradient — never both. The mode is the gradientEnabled flag; resolveGradient
 * (used by the live menu + the preview) honours it. Writes into the in-progress
 * per-design settings; persisted by the design's "Enregistrer les réglages".
 */
export default function ColorsTab({ ctrl, designId }: { ctrl: DesignSettingsController; designId: DesignId }) {
  const { s, set } = ctrl
  const accent = s.accent || DESIGN_ACCENTS[designId]
  const angle = Number.isFinite(s.gradientAngle) ? s.gradientAngle : 135
  const gradientCss = `linear-gradient(${angle}deg, ${s.gradientFrom}, ${s.gradientTo})`
  const mode: 'flat' | 'grad' = s.gradientEnabled ? 'grad' : 'flat'

  const applyPreset = (g: (typeof GRADIENTS)[number]) => {
    set('gradientFrom', g.from)
    set('gradientTo', g.to)
    set('gradientAngle', g.angle)
    if (!s.gradientEnabled) set('gradientEnabled', true)
  }
  const isPreset = (g: (typeof GRADIENTS)[number]) =>
    (s.gradientFrom || '').toLowerCase() === g.from.toLowerCase() &&
    (s.gradientTo || '').toLowerCase() === g.to.toLowerCase() &&
    angle === g.angle

  return (
    <div className="space-y-6">
      {/* Exclusive mode switch: flat colour OR gradient */}
      <div role="group" aria-label="Type de couleur" className="inline-flex w-full gap-1 rounded-xl bg-zinc-100 p-1 sm:w-auto">
        <ModeBtn label="Couleur unie" icon="drop" active={mode === 'flat'} onClick={() => set('gradientEnabled', false)} />
        <ModeBtn label="Dégradé" icon="swatch" active={mode === 'grad'} onClick={() => set('gradientEnabled', true)} />
      </div>

      {mode === 'flat' ? (
        <section>
          <Field label="Choisissez une couleur">
            <div className="flex flex-wrap items-center gap-2.5">
              {FLAT_PRESETS.map((c) => {
                const active = (s.accent || '').toLowerCase() === c.toLowerCase()
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('accent', c)}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={active}
                    className={`h-9 w-9 rounded-full ring-offset-2 transition ${active ? 'ring-2 ring-zinc-800' : 'ring-1 ring-zinc-200 hover:ring-zinc-300'}`}
                    style={{ backgroundColor: c }}
                  />
                )
              })}
              <label className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ring-1 ring-zinc-200 hover:ring-zinc-300" title="Couleur personnalisée">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => set('accent', e.target.value)}
                  aria-label="Couleur personnalisée"
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </label>
            </div>
          </Field>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-zinc-400">{s.accent || 'Couleur par défaut'}</span>
            {s.accent && (
              <button type="button" onClick={() => set('accent', null)} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
                Réinitialiser
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-zinc-400">Une couleur unie habille les en-têtes, boutons et pastilles de prix de votre menu.</p>
        </section>
      ) : (
        <section className="space-y-5">
          <Field label="Dégradés prédéfinis">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {GRADIENTS.map((g) => {
                const active = isPreset(g)
                return (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => applyPreset(g)}
                    aria-label={`Dégradé ${g.name}`}
                    aria-pressed={active}
                    className={`relative h-12 overflow-hidden rounded-lg ring-offset-2 transition ${active ? 'ring-2 ring-zinc-800' : 'ring-1 ring-zinc-200 hover:ring-zinc-300'}`}
                    style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                  >
                    <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-white drop-shadow-sm">{g.name}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="border-t border-zinc-100" />

          <Field label="Personnalisé">
            <div className="h-[46px] w-full rounded-xl ring-1 ring-inset ring-zinc-200" style={{ background: gradientCss }} aria-hidden="true" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De">
              <div className="flex items-center gap-2">
                <input type="color" value={s.gradientFrom} onChange={(e) => set('gradientFrom', e.target.value)} aria-label="Couleur de départ" className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200" />
                <span className="text-xs text-zinc-400">{s.gradientFrom}</span>
              </div>
            </Field>
            <Field label="Vers">
              <div className="flex items-center gap-2">
                <input type="color" value={s.gradientTo} onChange={(e) => set('gradientTo', e.target.value)} aria-label="Couleur de fin" className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200" />
                <span className="text-xs text-zinc-400">{s.gradientTo}</span>
              </div>
            </Field>
          </div>
          <Field label={`Angle : ${angle}°`}>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={360} step={5} value={angle} onChange={(e) => set('gradientAngle', Number(e.target.value))} aria-label="Angle du dégradé" className="w-full accent-orange-500" />
              <span className="w-12 shrink-0 text-right text-sm font-medium text-zinc-600">{angle}°</span>
            </div>
          </Field>
          <p className="text-xs text-zinc-400">Le dégradé habille les en-têtes, boutons, pastilles de prix et le bouton flottant de votre menu.</p>
        </section>
      )}
    </div>
  )
}

function ModeBtn({ label, icon, active, onClick }: { label: string; icon: 'drop' | 'swatch'; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
        active ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === 'drop' ? (
          <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z" />
        ) : (
          <>
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" />
          </>
        )}
      </svg>
      {label}
    </button>
  )
}
