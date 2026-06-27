'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Resp = {
  id: string
  gate_id: string
  answers: { question: string; answer: string }[]
  created_at: string
}

/**
 * Owner view of the inline-survey answers collected by the play-gates.
 * Reads game_survey_responses for this business (RLS: owner-read). Renders
 * nothing until there is at least one response, so it stays out of the way.
 */
export default function SurveyResponses({ businessId }: { businessId: string }) {
  const supabase = createClient()
  const [responses, setResponses] = useState<Resp[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await (supabase.from('game_survey_responses') as any)
        .select('id, gate_id, answers, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(300)
      if (cancelled) return
      if (!error) setResponses((data as Resp[]) || [])
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [businessId, supabase])

  if (!loaded || responses.length === 0) return null

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <h4 className="font-semibold text-zinc-900">Réponses au sondage</h4>
          <p className="text-xs text-zinc-400">{responses.length} réponse{responses.length > 1 ? 's' : ''} reçue{responses.length > 1 ? 's' : ''}</p>
        </div>
        <span className="shrink-0 text-zinc-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 max-h-[28rem] space-y-2.5 overflow-y-auto">
          {responses.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
              <p className="text-[11px] font-medium text-zinc-400">
                {new Date(r.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="mt-1.5 space-y-1.5">
                {(Array.isArray(r.answers) ? r.answers : []).map((a, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-zinc-500">{a.question}</p>
                    <p className="text-sm text-zinc-900">{a.answer?.trim() || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
