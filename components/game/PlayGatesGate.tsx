'use client'

import { useEffect, useState } from 'react'
import { GATE_TYPES, type GameGate } from '@/lib/game'

const doneKey = (slug: string, id: string) => `scaniha_gate_${slug}_${id}`

/**
 * Player-facing "Conditions pour jouer". Each enabled gate must be cleared
 * before the spin unlocks: link gates open the URL then self-confirm; the
 * survey gate shows inline questions and POSTs the answers. Completion is
 * remembered per device (localStorage). Calls onAllDone when everything is done.
 */
export default function PlayGatesGate({
  gates,
  slug,
  deviceId,
  accent,
  gradient,
  onAllDone,
}: {
  gates: GameGate[]
  slug: string
  deviceId: string
  accent: string
  gradient: string
  onAllDone: () => void
}) {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [opened, setOpened] = useState<Record<string, boolean>>({})
  const [surveyOpen, setSurveyOpen] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const d: Record<string, boolean> = {}
    for (const g of gates) {
      try { if (localStorage.getItem(doneKey(slug, g.id))) d[g.id] = true } catch {}
    }
    setDone(d)
  }, [gates, slug])

  useEffect(() => {
    if (gates.length > 0 && gates.every((g) => done[g.id])) onAllDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, gates])

  // Auto-confirm link gates when the player comes back to the tab/app after opening.
  // No "J'ai fait" step — returning to the page counts as done.
  useEffect(() => {
    const confirmOpened = () => {
      if (document.visibilityState !== 'visible') return
      setDone((d) => {
        let changed = false
        const next = { ...d }
        for (const g of gates) {
          if (g.type !== 'survey' && opened[g.id] && !next[g.id]) {
            next[g.id] = true
            try { localStorage.setItem(doneKey(slug, g.id), '1') } catch {}
            changed = true
          }
        }
        return changed ? next : d
      })
    }
    document.addEventListener('visibilitychange', confirmOpened)
    window.addEventListener('focus', confirmOpened)
    return () => {
      document.removeEventListener('visibilitychange', confirmOpened)
      window.removeEventListener('focus', confirmOpened)
    }
  }, [gates, opened, slug])

  function mark(id: string) {
    try { localStorage.setItem(doneKey(slug, id), '1') } catch {}
    setDone((d) => ({ ...d, [id]: true }))
  }

  function openLink(g: GameGate) {
    if (g.url) { try { window.open(g.url, '_blank', 'noopener,noreferrer') } catch {} }
    setOpened((o) => ({ ...o, [g.id]: true }))
  }

  async function submitSurvey(g: GameGate) {
    setSubmitting(true)
    const payload = (g.questions || []).map((q) => ({ question: q.text, answer: answers[q.id] || '' }))
    try {
      await fetch(`/api/game/${slug}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateId: g.id, deviceId, answers: payload }),
      })
    } catch {}
    setSubmitting(false)
    setSurveyOpen(null)
    mark(g.id)
  }

  const remaining = gates.filter((g) => !done[g.id]).length

  return (
    <div className="rounded-3xl border-2 bg-white p-5 text-center shadow-sm" style={{ borderColor: accent }}>
      <p className="text-2xl">🔓</p>
      <h2 className="mt-1.5 text-lg font-extrabold text-zinc-900">Débloquez votre tour</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Complétez {remaining > 1 ? `ces ${remaining} actions` : 'cette action'} pour tourner la roue.
      </p>

      <div className="mt-4 space-y-2.5 text-left">
        {gates.map((g) => {
          const isDone = !!done[g.id]
          const meta = GATE_TYPES.find((t) => t.type === g.type) || GATE_TYPES[4]
          const isSurvey = g.type === 'survey'
          return (
            <div key={g.id} className={`rounded-2xl border p-3 transition ${isDone ? 'border-green-200 bg-green-50/50' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${isDone ? 'bg-green-500 text-white' : 'bg-zinc-100'}`}>
                  {isDone ? '✓' : meta.emoji}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{g.label}</span>
                {!isDone &&
                  (isSurvey ? (
                    <button
                      type="button"
                      onClick={() => setSurveyOpen(surveyOpen === g.id ? null : g.id)}
                      className="shrink-0 rounded-full px-3.5 py-2 text-xs font-bold text-white"
                      style={{ backgroundImage: gradient }}
                    >
                      Répondre
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openLink(g)}
                      className="shrink-0 rounded-full px-3.5 py-2 text-xs font-bold text-white"
                      style={{ backgroundImage: gradient }}
                    >
                      {opened[g.id] ? 'Vérification…' : 'Ouvrir ↗'}
                    </button>
                  ))}
              </div>

              {isSurvey && surveyOpen === g.id && !isDone && (
                <div className="mt-3 space-y-2.5">
                  {(g.questions || []).map((q) => (
                    <div key={q.id}>
                      <label className="mb-1 block text-xs font-semibold text-zinc-600">{q.text}</label>
                      <input
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2"
                        style={{ ['--tw-ring-color' as any]: `${accent}55` }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitSurvey(g)}
                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundImage: gradient }}
                  >
                    {submitting ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
