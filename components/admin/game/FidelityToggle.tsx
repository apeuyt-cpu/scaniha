'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { designApi } from '@/lib/admin/design-api'
import Toggle from '@/components/admin/kit/Toggle'

/**
 * Master switch — "Menu QR seul" ↔ "Menu + Fidélité". Stored business-wide in
 * businesses.design_settings.loyaltyEnabled. OFF: the public menu is a plain QR
 * menu (no bottom nav, no profil, no roue, no points). ON: the whole engagement
 * layer appears. Self-contained: reads + writes design_settings (merge), then
 * revalidates the live menu. Opt-in — defaults OFF.
 */
export default function FidelityToggle({ businessId }: { businessId: string }) {
  const supabase = createClient()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await (supabase.from('businesses') as any)
        .select('design_settings')
        .eq('id', businessId)
        .maybeSingle()
      if (!cancelled) setEnabled(data?.design_settings?.loyaltyEnabled !== false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function change(next: boolean) {
    const prev = enabled
    setEnabled(next) // optimistic
    setSaving(true)
    try {
      // Server re-reads the freshest design_settings, merges only this key
      // (never clobbers contact/seo/…) and busts the public menu cache.
      await designApi('mergeSettings', { patch: { loyaltyEnabled: next } })
    } catch {
      setEnabled(prev ?? false) // revert on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <Toggle
        checked={enabled === true}
        disabled={enabled === null || saving}
        onChange={change}
        label="Système de fidélité"
        hint="Activé : la roue, le profil, les points et la barre de navigation apparaissent sur votre menu. Désactivé : un menu QR simple, rien d’autre."
      />
      {enabled === false && (
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          Mode <span className="font-semibold text-zinc-700">menu QR seul</span>. La roue, le profil et les points restent
          masqués pour vos clients tant que ce système n’est pas activé.
        </p>
      )}
    </div>
  )
}
