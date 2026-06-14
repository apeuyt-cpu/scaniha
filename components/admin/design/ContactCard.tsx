'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/admin/ui/Toast'
import { inputClass } from '@/components/admin/ui/Field'
import Toggle from '@/components/admin/ui/Toggle'

type Contact = { enabled: boolean; phone: string; address: string; hours: string }

/**
 * "Contact & horaires" — BRAND-level (shared across every design), stored in
 * design_settings.contact. The menu footer reads it via getDesignSettings, which
 * merges this over any legacy per-design value. Self-contained: fetches + saves
 * its own slice without clobbering other design_settings keys.
 */
export default function ContactCard({ businessId }: { businessId: string }) {
  const supabase = createClient()
  const toast = useToast()
  const [c, setC] = useState<Contact>({ enabled: false, phone: '', address: '', hours: '' })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await (supabase.from('businesses') as any).select('design_settings').eq('id', businessId).single()
      if (cancelled) return
      const ct = (data?.design_settings && (data.design_settings as any).contact) || {}
      setC({ enabled: !!ct.enabled, phone: ct.phone || '', address: ct.address || '', hours: ct.hours || '' })
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [businessId, supabase])

  async function save(next: Contact) {
    setSaving(true)
    try {
      // Re-read so we only replace the `contact` key, never other designs' settings.
      const { data: fresh } = await (supabase.from('businesses') as any).select('design_settings').eq('id', businessId).single()
      const ds = fresh?.design_settings && typeof fresh.design_settings === 'object' ? fresh.design_settings : {}
      const { error } = await (supabase.from('businesses') as any)
        .update({ design_settings: { ...ds, contact: next } })
        .eq('id', businessId)
      if (error) throw error
      toast.success('Contact & horaires enregistrés')
    } catch (e: any) {
      toast.error(e.message || 'Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <Toggle
        label="Pied de page : contact & horaires"
        hint="Affiche téléphone, adresse, horaires (et vos réseaux sociaux) en bas du menu."
        checked={c.enabled}
        onChange={(v) => setC((cur) => ({ ...cur, enabled: v }))}
      />

      {c.enabled && (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Téléphone</span>
            <input value={c.phone} disabled={!loaded} onChange={(e) => setC((cur) => ({ ...cur, phone: e.target.value }))} placeholder="+216 ..." className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Adresse</span>
            <input value={c.address} disabled={!loaded} onChange={(e) => setC((cur) => ({ ...cur, address: e.target.value }))} placeholder="Rue, ville" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Horaires</span>
            <input value={c.hours} disabled={!loaded} onChange={(e) => setC((cur) => ({ ...cur, hours: e.target.value }))} placeholder="Lun–Dim · 9h–23h" className={inputClass} />
          </label>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => save(c)}
          disabled={saving || !loaded}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
  )
}
