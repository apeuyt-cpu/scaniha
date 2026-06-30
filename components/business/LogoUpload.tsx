'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteImage, uploadBusinessLogo } from '@/lib/storage'
import { revalidatePublicMenu } from '@/lib/revalidate-menu'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'

interface LogoUploadProps {
  businessId: string
  currentLogoUrl?: string | null
  onLogoUpdated?: (logoUrl: string) => void
  compact?: boolean
}

export default function LogoUpload({ businessId, currentLogoUrl, onLogoUpdated, compact }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const supabase = createClient()

  const handleDeleteLogo = async () => {
    setConfirmDelete(false)
    setUploading(true)
    try {
      const oldLogoUrl = preview
      const { error } = await (supabase.from('businesses') as any)
        .update({ logo_url: null })
        .eq('id', businessId)
      if (error) throw error
      if (oldLogoUrl) {
        try { await deleteImage(oldLogoUrl) } catch {}
      }
      revalidatePublicMenu() // push the logo removal to the live menu now
      setPreview(null)
      onLogoUpdated?.('')
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression du logo')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La taille de l\'image doit être inférieure à 5 Mo')
      return
    }

    setError(null)
    setUploading(true)

    let uploadedLogoUrl: string | null = null

    try {
      const logoUrl = await uploadBusinessLogo(businessId, file)
      uploadedLogoUrl = logoUrl

      const { error: updateError } = await (supabase
        .from('businesses') as any)
        .update({ logo_url: logoUrl })
        .eq('id', businessId)

      if (updateError) throw updateError

      if (preview && preview !== logoUrl) {
        try { await deleteImage(preview) } catch {}
      }

      revalidatePublicMenu() // push the new logo to the live menu now
      setPreview(logoUrl)
      onLogoUpdated?.(logoUrl)
    } catch (err: any) {
      if (uploadedLogoUrl) {
        try { await deleteImage(uploadedLogoUrl) } catch {}
      }
      setError(err.message || 'Échec du téléversement du logo')
    } finally {
      setUploading(false)
    }
  }

  // Compact mode for dashboard
  if (compact) {
    return (
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <span className={`px-3 py-1.5 text-sm lg:text-base font-medium rounded-xl transition-colors ${
          uploading 
            ? 'bg-zinc-200 text-zinc-400' 
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        }`}>
          {uploading ? 'Téléversement...' : preview ? 'Modifier' : 'Téléverser'}
        </span>
      </label>
    )
  }

  // Full mode for settings page
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-zinc-700">Logo de l'établissement</label>

      <div className="flex items-center gap-6">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Logo de l'établissement"
              className="h-24 w-24 object-contain rounded-xl border-2 border-zinc-200 bg-white"
            />
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={uploading}
              aria-label="Supprimer le logo"
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="h-24 w-24 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center bg-zinc-50">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <div className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 inline-block font-semibold text-sm transition">
              {uploading ? 'Téléversement...' : preview ? 'Modifier le logo' : 'Téléverser le logo'}
            </div>
          </label>
          <p className="text-xs text-zinc-500 mt-2">PNG, JPG jusqu'à 5 Mo</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer le logo ?"
        message="Votre menu s'affichera sans logo jusqu'à ce que vous en ajoutiez un nouveau."
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDeleteLogo}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
