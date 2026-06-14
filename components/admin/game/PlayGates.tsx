'use client'

import { createClient } from '@/lib/supabase/client'
import { GATE_TYPES, type GatesConfig, type GameGate, type GateType } from '@/lib/game'
import Toggle from '@/components/admin/ui/Toggle'
import { inputClass } from '@/components/admin/ui/Field'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'g' + Math.random().toString(36).slice(2)

/**
 * "Conditions pour jouer" — the owner can require actions (follow a social,
 * open a link, answer an inline survey) before a customer can spin. The config
 * lives in games.config.gates (jsonb); survey ANSWERS go to game_survey_responses.
 * Self-contained: writes games.config itself and lifts the new config to the parent.
 */
export default function PlayGates({
  gameId,
  config,
  onConfig,
}: {
  gameId: string
  config: Record<string, any>
  onConfig: (c: Record<string, any>) => void
}) {
  const supabase = createClient()
  const gates: GatesConfig =
    config?.gates && typeof config.gates === 'object' && Array.isArray(config.gates.items)
      ? config.gates
      : { enabled: false, items: [] }

  function commit(next: GatesConfig) {
    const nextConfig = { ...(config || {}), gates: next }
    onConfig(nextConfig)
    ;(supabase.from('games') as any)
      .update({ config: nextConfig })
      .eq('id', gameId)
      .then(({ error }: any) => { if (error) console.error('gates save:', error.message) })
  }

  const setItems = (items: GameGate[]) => commit({ ...gates, items })
  const updateGate = (id: string, patch: Partial<GameGate>) =>
    setItems(gates.items.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  function addGate(type: GateType) {
    const meta = GATE_TYPES.find((t) => t.type === type)!
    const g: GameGate = meta.isLink
      ? { id: uid(), type, label: meta.label, enabled: true, url: '' }
      : { id: uid(), type, label: 'Sondage', enabled: true, questions: [{ id: uid(), text: '' }] }
    setItems([...gates.items, g])
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="min-w-0">
        <h4 className="font-semibold text-zinc-900">Conditions pour jouer</h4>
        <p className="mt-0.5 text-xs text-zinc-400">
          Exigez une action avant de tourner la roue : suivre un réseau, ouvrir un lien, ou répondre à un sondage.
        </p>
      </div>

      <div className="mt-3">
        <Toggle
          checked={gates.enabled}
          onChange={(v) => commit({ ...gates, enabled: v })}
          label={gates.enabled ? 'Conditions activées' : 'Conditions désactivées'}
          hint={gates.enabled ? 'Le client doit tout compléter avant de jouer.' : 'Activez pour exiger une action avant de jouer.'}
        />
      </div>

      {gates.enabled && (
        <>
          <div className="mt-4 space-y-2.5">
            {gates.items.map((gate) => {
              const meta = GATE_TYPES.find((t) => t.type === gate.type) || GATE_TYPES[4]
              return (
                <div key={gate.id} className={`rounded-xl border p-3 ${gate.enabled ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{meta.emoji}</span>
                    <input
                      value={gate.label}
                      onChange={(e) => updateGate(gate.id, { label: e.target.value })}
                      placeholder="Intitulé (ex. Suivez-nous sur Instagram)"
                      className={`${inputClass} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => updateGate(gate.id, { enabled: !gate.enabled })}
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${gate.enabled ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}
                    >
                      {gate.enabled ? 'Actif' : 'Inactif'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setItems(gates.items.filter((g) => g.id !== gate.id))}
                      aria-label="Supprimer la condition"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>

                  {meta.isLink ? (
                    <input
                      value={gate.url || ''}
                      onChange={(e) => updateGate(gate.id, { url: e.target.value })}
                      placeholder="https://…"
                      inputMode="url"
                      className={`${inputClass} mt-2 w-full`}
                    />
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {(gate.questions || []).map((q, qi) => (
                        <div key={q.id} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-400">{qi + 1}.</span>
                          <input
                            value={q.text}
                            onChange={(e) =>
                              updateGate(gate.id, {
                                questions: (gate.questions || []).map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)),
                              })
                            }
                            placeholder="Votre question…"
                            className={`${inputClass} min-w-0 flex-1`}
                          />
                          <button
                            type="button"
                            aria-label="Supprimer la question"
                            onClick={() => updateGate(gate.id, { questions: (gate.questions || []).filter((x) => x.id !== q.id) })}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateGate(gate.id, { questions: [...(gate.questions || []), { id: uid(), text: '' }] })}
                        className="text-xs font-semibold text-orange-600 hover:underline"
                      >
                        + Ajouter une question
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {gates.items.length === 0 && (
              <p className="py-3 text-center text-sm text-zinc-400">Aucune condition — ajoutez-en une ci-dessous.</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {GATE_TYPES.map((gt) => (
              <button
                key={gt.type}
                type="button"
                onClick={() => addGate(gt.type)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-orange-300 hover:text-orange-600"
              >
                + {gt.emoji} {gt.label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            <span aria-hidden="true">💡</span> Le client confirme lui-même — un suivi ne peut pas être vérifié automatiquement. Les réponses au sondage arrivent dans votre tableau de bord.
          </p>
        </>
      )}
    </div>
  )
}
