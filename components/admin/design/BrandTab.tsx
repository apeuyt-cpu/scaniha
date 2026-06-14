'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LogoUpload from '@/components/business/LogoUpload'
import SocialMediaManager from '@/components/admin/SocialMediaManager'
import { useToast } from '@/components/admin/ui/Toast'
import { inputClass } from '@/components/admin/ui/Field'
import ContactCard from '@/components/admin/design/ContactCard'

interface BrandBusiness {
  id: string
  name: string
  logo_url?: string | null
}

/**
 * "Marque" tab — SHARED across every design. Writes to the BUSINESS row
 * (name, logo, social links), not to design_settings. Mirrors the inline
 * name-editor pattern from SettingsManager.
 */
export default function BrandTab({
  business,
  onLogoUpdated,
  onNameUpdated,
}: {
  business: BrandBusiness
  onLogoUpdated?: (logoUrl: string) => void
  onNameUpdated?: (name: string) => void
}) {
  const supabase = createClient()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(business.name)
  const [saving, setSaving] = useState(false)

  // Keep the edit buffer in sync with the canonical name from the parent
  // (lifted bizName) whenever it changes outside this field — e.g. saved here,
  // or BrandTab is reused across the design / classic workspaces. While the
  // user is actively editing, leave their in-progress text untouched.
  useEffect(() => {
    if (!editing) setName(business.name)
  }, [business.name, editing])

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Le nom de l'établissement ne peut pas être vide")
      return
    }
    setSaving(true)
    try {
      const { error } = await (supabase.from('businesses') as any).update({ name: trimmed }).eq('id', business.id)
      if (error) throw error
      setEditing(false)
      onNameUpdated?.(trimmed)
      toast.success("Nom de l'établissement enregistré")
    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
        Ces informations sont partagées entre tous les designs.
      </p>

      {/* Logo */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-base font-bold text-zinc-900">Logo</h3>
        <LogoUpload businessId={business.id} currentLogoUrl={business.logo_url} onLogoUpdated={onLogoUpdated} />
      </section>

      {/* Business name */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-base font-bold text-zinc-900">Nom de l&apos;établissement</h3>
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoFocus
              aria-label="Nom de l'établissement"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={() => {
                  setName(business.name)
                  setEditing(false)
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
            <span className="truncate text-sm text-zinc-900">{business.name}</span>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
            >
              Modifier
            </button>
          </div>
        )}
      </section>

      {/* Social media — brings its own card */}
      <SocialMediaManager businessId={business.id} />

      {/* Contact & hours — brand-level footer info (moved here from Modèle) */}
      <ContactCard businessId={business.id} />
    </div>
  )
}
