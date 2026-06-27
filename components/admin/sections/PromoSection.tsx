'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/kit/PageHeader'
import Card from '@/components/admin/kit/Card'
import Toggle from '@/components/admin/kit/Toggle'
import { useToast } from '@/components/admin/kit/Toast'
import { IconGift } from '@/components/admin/shell/icons'

const EMOJIS = ['🎉', '🔥', '⏰', '☕', '🍕', '🎁', '⭐', '💥', '']

/**
 * Owner editor for the public-menu promo banner (design_settings.promo).
 * Toggle + message + emoji + optional expiry date, with a live preview of the
 * exact banner the diner sees above the menu. Saves via /api/admin/promo.
 */
export default function PromoSection() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accent, setAccent] = useState('#F47B20')
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState('🎉')
  const [until, setUntil] = useState('') // YYYY-MM-DD

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const b = await fetch('/api/admin/business').then((r) => (r.ok ? r.json() : null))
        if (alive && b?.primary_color) setAccent(b.primary_color)
        const p = await fetch('/api/admin/promo').then((r) => (r.ok ? r.json() : null))
        if (alive && p) {
          setEnabled(!!p.enabled)
          setMessage(p.message || '')
          setEmoji(typeof p.emoji === 'string' ? p.emoji : '🎉')
          setUntil(p.until ? String(p.until).slice(0, 10) : '')
        }
      } catch {
        if (alive) error('Impossible de charger les réglages.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [error])

  async function save(nextEnabled: boolean) {
    if (nextEnabled && !message.trim()) { error('Saisissez le texte de l’annonce.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled, message: message.trim(), emoji, until: until || undefined }),
      })
      if (!res.ok) throw new Error('save failed')
      const p = await res.json()
      setEnabled(!!p.enabled)
      success('Annonce enregistrée.')
    } catch {
      error('Échec de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const expired = !!until && new Date(until + 'T23:59:59').getTime() < Date.now()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Promotions" subtitle="Affichez une annonce en haut de votre menu (offre, horaire, message)." icon={<IconGift width={20} height={20} />} />

      <Card>
        <Toggle
          checked={enabled}
          onChange={(v) => { setEnabled(v); save(v) }}
          disabled={loading || saving}
          label="Afficher l’annonce"
          hint="Une bande colorée apparaît tout en haut de votre menu public."
        />

        <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-5">
          <div>
            <label htmlFor="promo-msg" className="mb-1 block text-sm font-medium text-[var(--ink)]">Texte de l’annonce</label>
            <input
              id="promo-msg"
              value={message}
              maxLength={140}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex. Happy hour 17h–19h : -20% sur les boissons ☕"
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">{message.length}/140</p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--ink)]">Émoji</span>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e || 'none'}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-pressed={emoji === e}
                  className={`grid h-9 w-9 place-items-center rounded-xl border text-lg transition ${emoji === e ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-white hover:bg-zinc-50'}`}
                >
                  {e || <span className="text-xs font-semibold text-[var(--muted)]">∅</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="promo-until" className="mb-1 block text-sm font-medium text-[var(--ink)]">Expire le <span className="font-normal text-[var(--muted)]">(optionnel)</span></label>
            <input
              id="promo-until"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
            />
            {expired && <p className="mt-1 text-xs font-medium text-amber-600">Cette date est passée — l’annonce ne s’affichera pas.</p>}
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Aperçu</p>
          {message.trim() ? (
            <div className="overflow-hidden rounded-xl">
              <div className="flex items-center justify-center gap-2 px-8 py-2.5 text-center text-[13.5px] font-semibold text-white" style={{ backgroundColor: accent }}>
                {emoji ? <span aria-hidden="true">{emoji}</span> : null}
                <span>{message}</span>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--line)] bg-zinc-50 px-4 py-4 text-center text-sm text-[var(--muted)]">Saisissez un texte pour voir l’aperçu.</p>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => save(enabled)}
            disabled={loading || saving}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </Card>
    </div>
  )
}
