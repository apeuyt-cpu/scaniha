'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/supabase/database.types'
import { useToast } from './Toast'
import Button from '@/components/admin/kit/Button'
import Toggle from '@/components/admin/kit/Toggle'
import { inputClass } from '@/components/admin/kit/Field'
import { QR_TTL_OPTIONS } from '@/lib/game'
import MenuDesignPicker, { type ThemeCtrl } from '@/components/admin/MenuDesignPicker'
import { isDesignId, DESIGN_ACCENTS, getDesignSettings, type DesignId } from '@/lib/design-settings'
import { Skeleton } from '@/components/admin/kit/Skeleton'
import { uploadBusinessLogo, deleteImage } from '@/lib/storage'
import StatTile, { type StatTone } from './StatTile'

type Business = Database['public']['Tables']['businesses']['Row'] & {
  profiles: { email: string | null; phone_number: string | null } | null
}

interface BusinessManagerProps {
  businesses: Business[]
}

const extendPresets = [
  { label: '+ 7 j', days: 7 },
  { label: '+ 30 j', days: 30 },
  { label: '+ 90 j', days: 90 },
  { label: '+ 1 an', days: 365 },
]

const PAGE_SIZE = 20

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'suspended' | 'unlimited'
type SortKey = 'expiry_asc' | 'expiry_desc' | 'name' | 'recent'

/** Display info from expires_at (read-only). */
function getTimeRemaining(expiresAt: string | null) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { text: 'Expiré', color: 'text-red-600', urgent: true, expired: true }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 30) return { text: `${days} j restants`, color: 'text-green-600', urgent: false, expired: false }
  if (days > 7) return { text: `${days} j restants`, color: 'text-blue-600', urgent: false, expired: false }
  if (days > 0) return { text: `${days} j ${hours} h restants`, color: 'text-amber-600', urgent: true, expired: false }
  if (hours > 0) return { text: `${hours} h ${mins} min restants`, color: 'text-orange-600', urgent: true, expired: false }
  return { text: `${mins} min restantes`, color: 'text-red-600', urgent: true, expired: false }
}

/** "10 min" / "2 h" label for a scan-session TTL. */
function ttlLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = min / 60
  return Number.isInteger(h) ? `${h} h` : `${min} min`
}

/** Per-café QR-gate state, loaded lazily when the detail sheet opens. */
type QrGateState = { exists: boolean; gameActive?: boolean; enabled?: boolean; ttlMin?: number; hasKey?: boolean }

function bucketOf(b: Business): Exclude<StatusFilter, 'all'> {
  if (b.status === 'paused') return 'suspended'
  if (!b.expires_at) return 'unlimited'
  const t = getTimeRemaining(b.expires_at)
  if (t?.expired) return 'expired'
  const days = (new Date(b.expires_at).getTime() - Date.now()) / 86400000
  return days <= 7 ? 'expiring' : 'active'
}

export default function BusinessManager({ businesses: initial }: BusinessManagerProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [businesses, setBusinesses] = useState(initial)
  // Re-seed from fresh server data after a soft refresh (e.g. profile sync).
  useEffect(() => { setBusinesses(initial) }, [initial])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Sheet-local state (only one sheet open at a time).
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [extendDays, setExtendDays] = useState('')
  const [exactDate, setExactDate] = useState('')
  const [suspendConfirm, setSuspendConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteNameInput, setDeleteNameInput] = useState('')
  // QR scan-to-play gate (games.config.qrGate) — loaded per café when the sheet opens.
  const [qrGate, setQrGate] = useState<QrGateState | null>(null)
  const [qrRegenConfirm, setQrRegenConfirm] = useState(false)
  // Product mode (design_settings.products) — loaded per café when the sheet opens.
  const [productMode, setProductMode] = useState<{ products: string | null } | null>(null)
  // QR table ordering + POS provisioning (design_settings.ordering / .pos).
  const [ordering, setOrdering] = useState<{ enabled: boolean; tables: number; hasKey: boolean } | null>(null)
  const [pos, setPos] = useState<{ enabled: boolean } | null>(null)
  // Design (theme_id + primary_color) — both already on the business row.
  const [themeSaving, setThemeSaving] = useState<string | null>(null)
  const [themeSaved, setThemeSaved] = useState<string | null>(null)
  const [designError, setDesignError] = useState<string | null>(null)
  // Logo (logo_url on the business row).
  const [logoBusy, setLogoBusy] = useState(false)
  const [removeLogoConfirm, setRemoveLogoConfirm] = useState(false)

  const selected = useMemo(() => businesses.find((b) => b.id === selectedId) || null, [businesses, selectedId])

  // Reset sheet-local state whenever the open business changes.
  useEffect(() => {
    setEditingProfile(false)
    setEditName('')
    setEditEmail('')
    setEditPhone('')
    setExtendDays('')
    setExactDate('')
    setSuspendConfirm(false)
    setDeleteConfirm(false)
    setDeleteNameInput('')
    setQrRegenConfirm(false)
    setThemeSaving(null)
    setThemeSaved(null)
    setDesignError(null)
    setLogoBusy(false)
    setRemoveLogoConfirm(false)
  }, [selectedId])

  // Lazy-load the café's QR-gate state when a detail sheet opens.
  useEffect(() => {
    if (!selectedId) { setQrGate(null); return }
    let cancelled = false
    setQrGate(null)
    fetch(`/api/super-admin/businesses/${selectedId}/qr-gate`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setQrGate(j) })
      .catch(() => { if (!cancelled) setQrGate({ exists: false }) })
    return () => { cancelled = true }
  }, [selectedId])

  // Lazy-load the café's product mode when a detail sheet opens.
  useEffect(() => {
    if (!selectedId) { setProductMode(null); return }
    let cancelled = false
    setProductMode(null)
    fetch(`/api/super-admin/businesses/${selectedId}/products`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setProductMode({ products: j.products ?? null }) })
      .catch(() => { if (!cancelled) setProductMode({ products: null }) })
    return () => { cancelled = true }
  }, [selectedId])

  // Lazy-load ordering + POS provisioning state when a detail sheet opens.
  useEffect(() => {
    if (!selectedId) { setOrdering(null); setPos(null); return }
    let cancelled = false
    setOrdering(null); setPos(null)
    fetch(`/api/super-admin/businesses/${selectedId}/ordering`).then((r) => r.json())
      .then((j) => { if (!cancelled) setOrdering({ enabled: !!j.enabled, tables: j.tables ?? 0, hasKey: !!j.hasKey }) })
      .catch(() => { if (!cancelled) setOrdering({ enabled: false, tables: 0, hasKey: false }) })
    fetch(`/api/super-admin/businesses/${selectedId}/pos`).then((r) => r.json())
      .then((j) => { if (!cancelled) setPos({ enabled: !!j.enabled }) })
      .catch(() => { if (!cancelled) setPos({ enabled: false }) })
    return () => { cancelled = true }
  }, [selectedId])

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!selectedId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedId])

  const counts = useMemo(() => {
    const c = { all: businesses.length, active: 0, expiring: 0, expired: 0, suspended: 0, unlimited: 0 }
    for (const b of businesses) c[bucketOf(b)]++
    return c
  }, [businesses])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    let list = businesses.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q) && !b.slug.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && bucketOf(b) !== statusFilter) return false
      return true
    })
    const expiryValue = (b: Business) => (b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY)
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'expiry_asc': return expiryValue(a) - expiryValue(b)
        case 'expiry_desc': return expiryValue(b) - expiryValue(a)
        case 'name': return a.name.localeCompare(b.name, 'fr')
        case 'recent': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return 0
      }
    })
    return list
  }, [businesses, searchTerm, statusFilter, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const resetPage = () => setPage(1)

  // ── Time ───────────────────────────────────────────────────────────
  const extendTime = async (businessId: string, days: number) => {
    setLoading(`time-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'extend', minutes: days * 24 * 60 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la prolongation.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, ...json.data } : b)))
      setExtendDays('')
      setExactDate('')
      toast(`Durée prolongée de ${days} jour(s).`, 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  const handleCustomExtend = (businessId: string) => {
    const days = parseInt(extendDays, 10)
    if (!days || days <= 0) { toast('Saisissez un nombre de jours valide.', 'error'); return }
    extendTime(businessId, days)
  }

  const setExactExpiry = async (businessId: string) => {
    if (!exactDate) { toast('Choisissez une date d’expiration.', 'error'); return }
    const target = new Date(`${exactDate}T23:59:59`)
    if (isNaN(target.getTime()) || target.getTime() <= Date.now()) { toast('La date doit être dans le futur.', 'error'); return }
    setLoading(`time-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'set', expiresAt: target.toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, ...json.data } : b)))
      setExtendDays('')
      setExactDate('')
      toast('Date d’expiration définie.', 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  const setUnlimited = async (businessId: string) => {
    setLoading(`time-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'unlimited' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, ...json.data } : b)))
      toast('Abonnement défini sur illimité.', 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // ── Status ──────────────────────────────────────────────────────────
  const setStatus = async (businessId: string, status: 'active' | 'paused') => {
    setLoading(`status-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour du statut.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, ...json.data } : b)))
      setSuspendConfirm(false)
      toast(status === 'paused' ? 'Établissement suspendu.' : 'Établissement réactivé.', 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // ── QR scan-to-play gate ────────────────────────────────────────────
  const patchQrGate = async (businessId: string, patch: Record<string, unknown>, okMsg: string) => {
    setLoading(`qr-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/qr-gate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setQrGate((cur) => ({ ...(cur || { exists: true }), ...json }))
      setQrRegenConfirm(false)
      toast(okMsg, 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // ── QR table ordering (design_settings.ordering) ────────────────────
  const patchOrdering = async (businessId: string, patch: Record<string, unknown>, okMsg: string) => {
    setLoading(`ordering-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/ordering`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setOrdering({ enabled: !!json.enabled, tables: json.tables ?? 0, hasKey: !!json.hasKey })
      toast(okMsg, 'success')
    } catch (err: any) { toast(err.message || 'Une erreur est survenue.', 'error') } finally { setLoading(null) }
  }

  // ── POS provisioning (design_settings.pos) ──────────────────────────
  const patchPos = async (businessId: string, enabled: boolean) => {
    setLoading(`pos-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/pos`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setPos({ enabled: !!json.enabled })
      toast(enabled ? 'Caisse POS activée.' : 'Caisse POS désactivée.', 'success')
    } catch (err: any) { toast(err.message || 'Une erreur est survenue.', 'error') } finally { setLoading(null) }
  }

  // ── Product mode (formule) ──────────────────────────────────────────
  const patchProducts = async (businessId: string, products: string | null, okMsg: string) => {
    setLoading(`products-${businessId}`)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      setProductMode({ products: json.products ?? null })
      toast(okMsg, 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // ── Logo ────────────────────────────────────────────────────────────
  // Upload (optimised) via the shared client helper, then persist the URL via
  // the super-admin design route (service role) so RLS doesn't block us.
  const uploadLogo = async (businessId: string, file: File) => {
    if (!file.type.startsWith('image/')) { toast('Veuillez choisir un fichier image.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Image trop lourde (max 5 Mo).', 'error'); return }
    const oldUrl = businesses.find((b) => b.id === businessId)?.logo_url || null
    setLogoBusy(true)
    try {
      const url = await uploadBusinessLogo(businessId, file)
      const res = await fetch(`/api/super-admin/businesses/${businessId}/design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: url }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour du logo.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, logo_url: url } : b)))
      if (oldUrl && oldUrl !== url) { try { await deleteImage(oldUrl) } catch {} }
      toast('Logo mis à jour.', 'success')
    } catch (err: any) {
      toast(err.message || 'Échec du téléversement du logo.', 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  const removeLogo = async (businessId: string) => {
    const oldUrl = businesses.find((b) => b.id === businessId)?.logo_url || null
    setLogoBusy(true)
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec de la suppression du logo.')
      setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, logo_url: null } : b)))
      if (oldUrl) { try { await deleteImage(oldUrl) } catch {} }
      setRemoveLogoConfirm(false)
      toast('Logo retiré.', 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  // ── Design (menu theme + accent colour) ────────────────────────────
  const patchDesign = async (businessId: string, patch: { theme_id?: string; primary_color?: string }, okMsg: string) => {
    setDesignError(null)
    setBusinesses((cur) => cur.map((b) => (b.id === businessId ? { ...b, ...patch } : b))) // optimistic
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      if (patch.theme_id) setThemeSaved(patch.theme_id)
      toast(okMsg, 'success')
    } catch (err: any) {
      setDesignError(err.message || 'Une erreur est survenue.')
      toast(err.message || 'Une erreur est survenue.', 'error')
    }
  }

  const selectTheme = (businessId: string, themeId: string) => {
    setThemeSaving(themeId)
    setThemeSaved(null)
    patchDesign(businessId, { theme_id: themeId }, 'Design appliqué.').finally(() => setThemeSaving(null))
  }

  // The colour the live menu actually shows: modern designs read
  // design_settings[designId].accent (gradient overrides it); classic themes
  // read primary_color. Reading the wrong one is why the picker looked "stuck".
  const effectiveAccent = (b: Business): string => {
    const theme = b.theme_id || 'design1'
    if (isDesignId(theme)) {
      const ds = (b.design_settings as any)?.[theme]
      // Mirror resolveAccent: in gradient mode the live menu uses gradientFrom,
      // so the flat-colour swatch must reflect that (not a dead accent value).
      if (ds?.gradientEnabled && ds?.gradientFrom) return ds.gradientFrom
      return ds?.accent || DESIGN_ACCENTS[theme as DesignId] || '#F47B20'
    }
    return b.primary_color || '#F47B20'
  }
  const gradientOn = (b: Business): boolean => {
    const theme = b.theme_id || 'design1'
    return isDesignId(theme) && !!(b.design_settings as any)?.[theme]?.gradientEnabled
  }

  // Live preview while dragging the colour input (mirrors what the API will save).
  const applyLocalColor = (bizId: string, color: string) =>
    setBusinesses((cur) => cur.map((x) => {
      if (x.id !== bizId) return x
      const theme = x.theme_id || 'design1'
      const next: any = { ...x, primary_color: color }
      if (isDesignId(theme)) {
        const ds = x.design_settings && typeof x.design_settings === 'object' ? (x.design_settings as any) : {}
        next.design_settings = { ...ds, [theme]: { ...(ds[theme] || {}), accent: color } }
      }
      return next
    }))

  // Commit on blur — the API writes accent (modern) or primary_color (classic).
  const commitColor = async (bizId: string, color: string) => {
    setDesignError(null)
    try {
      const res = await fetch(`/api/super-admin/businesses/${bizId}/design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      if (json.data) {
        setBusinesses((cur) => cur.map((b) => (b.id === bizId
          ? { ...b, primary_color: json.data.primary_color ?? b.primary_color, design_settings: json.data.design_settings ?? b.design_settings }
          : b)))
      }
      toast('Couleur mise à jour.', 'success')
    } catch (err: any) {
      setDesignError(err.message || 'Une erreur est survenue.')
      toast(err.message || 'Une erreur est survenue.', 'error')
    }
  }

  // Advanced appearance (gradient / showcase / tagline) — lives in
  // design_settings[designId], written via the same service-role endpoint.
  const applyLocalSettings = (bizId: string, patch: Record<string, any>) =>
    setBusinesses((cur) => cur.map((x) => {
      if (x.id !== bizId) return x
      const theme = x.theme_id || 'design1'
      if (!isDesignId(theme)) return x
      const ds = x.design_settings && typeof x.design_settings === 'object' ? (x.design_settings as any) : {}
      return { ...x, design_settings: { ...ds, [theme]: { ...(ds[theme] || {}), ...patch } } }
    }))

  const commitSettings = async (bizId: string, patch: Record<string, any>) => {
    applyLocalSettings(bizId, patch)
    setDesignError(null)
    try {
      const res = await fetch(`/api/super-admin/businesses/${bizId}/design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour.')
      if (json.data) {
        setBusinesses((cur) => cur.map((b) => (b.id === bizId ? { ...b, design_settings: json.data.design_settings ?? b.design_settings } : b)))
      }
      toast('Apparence mise à jour.', 'success')
    } catch (err: any) {
      setDesignError(err.message || 'Une erreur est survenue.')
      toast(err.message || 'Une erreur est survenue.', 'error')
    }
  }

  // "Gérer comme l'établissement" — start impersonation then open the real owner admin.
  const manageAs = async (businessId: string) => {
    setLoading(`manage-${businessId}`)
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Échec.')
      window.location.href = '/admin'
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
      setLoading(null)
    }
  }

  // ── Profile ─────────────────────────────────────────────────────────
  const startEditProfile = (business: Business) => {
    setEditingProfile(true)
    setEditName(business.name || '')
    setEditEmail(business.profiles?.email || '')
    setEditPhone(business.profiles?.phone_number || '')
  }

  const handleSaveProfile = async (businessId: string) => {
    const newName = editName.trim()
    if (!newName) { toast('Le nom de l’établissement est requis.', 'error'); return }
    const newEmail = editEmail.trim() || null
    const newPhone = editPhone.trim() || null
    const current = businesses.find((b) => b.id === businessId)
    setLoading(`profile-${businessId}`)
    try {
      // 1. Business name (own table + public-menu cache bust) — only if changed.
      if (newName !== current?.name) {
        const res = await fetch(`/api/super-admin/businesses/${businessId}/details`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j.error || 'Échec de la mise à jour du nom.')
      }
      // 2. Owner contact profile (email/phone). The route rejects an empty pair,
      // so only call it when there's at least one value to save.
      if (newEmail || newPhone) {
        const response = await fetch(`/api/super-admin/businesses/${businessId}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newEmail, phone_number: newPhone }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Échec de la mise à jour du profil.')
      }
      // Reflect what we actually submitted — the route can echo a stale value
      // when a field is cleared, so trust our own inputs (they match the DB).
      setBusinesses((cur) =>
        cur.map((b) => (b.id === businessId ? { ...b, name: newName, profiles: { email: newEmail, phone_number: newPhone } } : b))
      )
      setEditingProfile(false)
      toast('Profil mis à jour.', 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // ── Sync profiles ───────────────────────────────────────────────────
  const handleSyncProfiles = async () => {
    setSyncing(true)
    try {
      let response = await fetch('/api/super-admin/sync-profiles-direct', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!response.ok) {
        response = await fetch('/api/super-admin/sync-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      }
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || result.hint || 'Échec de la synchronisation.')
      if (result.errors && result.errors.length > 0) {
        toast(`${result.message || 'Synchronisation partielle'} (${result.errors.length} erreurs)`, 'error')
      } else {
        toast(result.message || `Synchronisation réussie : ${result.synced || 0} mis à jour.`, 'success')
      }
      router.refresh()
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setTimeout(() => setSyncing(false), 2000)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────
  const handleDeleteBusiness = async (business: Business) => {
    setLoading(`delete-${business.id}`)
    try {
      const response = await fetch(`/api/super-admin/businesses/${business.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteNameInput }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Échec de la suppression du compte.')
      setBusinesses((cur) => cur.filter((b) => b.id !== business.id))
      setSelectedId(null)
      toast(`Le compte « ${business.name} » a été supprimé.`, 'success')
    } catch (err: any) {
      toast(err.message || 'Une erreur est survenue.', 'error')
    } finally {
      setLoading(null)
    }
  }

  // One control: the KPI tiles double as the status filter (no separate chip row).
  const summaryTiles: { key: StatusFilter; label: string; count: number; tone: StatTone }[] = [
    { key: 'all', label: 'Total', count: counts.all, tone: 'zinc' },
    { key: 'active', label: 'Actifs', count: counts.active, tone: 'green' },
    { key: 'expiring', label: 'Expire ≤7 j', count: counts.expiring, tone: 'amber' },
    { key: 'expired', label: 'Expirés', count: counts.expired, tone: 'red' },
    { key: 'suspended', label: 'Suspendus', count: counts.suspended, tone: 'zinc' },
    { key: 'unlimited', label: 'Illimités', count: counts.unlimited, tone: 'zinc' },
  ]

  return (
    <div>
      {/* KPI tiles — also the status filter (click to filter the list) */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryTiles.map((t) => (
          <StatTile
            key={t.key}
            label={t.label}
            value={t.count}
            tone={t.tone}
            active={statusFilter === t.key}
            onClick={() => { setStatusFilter(t.key); resetPage() }}
          />
        ))}
      </div>

      {/* Search + sort + sync */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Rechercher par nom ou par lien…"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); resetPage() }}
          className={`${inputClass} flex-1`}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={`${inputClass} sm:w-56`}
          aria-label="Trier"
        >
          <option value="expiry_asc">Expiration (plus proche)</option>
          <option value="expiry_desc">Expiration (plus lointaine)</option>
          <option value="recent">Plus récents</option>
          <option value="name">Nom (A→Z)</option>
        </select>
        <Button variant="neutral" onClick={handleSyncProfiles} disabled={syncing} className="whitespace-nowrap">
          {syncing ? (<><Spinner /> Synchronisation…</>) : 'Synchroniser les profils'}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {paged.map((business) => {
          const timeInfo = getTimeRemaining(business.expires_at)
          const expiredButActive = business.status === 'active' && timeInfo?.expired
          return (
            <button
              key={business.id}
              onClick={() => setSelectedId(business.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ background: business.primary_color || '#F47B20' }}
                aria-hidden="true"
              >
                {business.name?.trim()?.[0]?.toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-zinc-900">{business.name}</h3>
                  <StatusChip status={business.status} />
                  {expiredButActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expiré</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-400" dir="ltr">/{business.slug}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-semibold ${business.expires_at ? timeInfo?.color : 'text-zinc-400'}`}>
                  {business.expires_at ? (<>{timeInfo?.urgent && <span aria-hidden="true">⚠️ </span>}{timeInfo?.text}</>) : 'Illimité'}
                </div>
              </div>
              <svg className="shrink-0 text-zinc-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center">
          <p className="text-zinc-500">Aucun compte ne correspond aux filtres.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-zinc-500">{filtered.length} résultat(s) · page {safePage} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="neutral" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Précédent</Button>
            <Button variant="neutral" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Suivant</Button>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <DetailSheet business={selected} onClose={() => setSelectedId(null)}>
          {(() => {
            const b = selected
            const timeInfo = getTimeRemaining(b.expires_at)
            const expiredButActive = b.status === 'active' && timeInfo?.expired
            const timeBusy = loading === `time-${b.id}`
            return (
              <div className="space-y-6">
                {/* Full owner admin (impersonation) — the primary action */}
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Gérer comme l’établissement</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Ouvre l’admin complet de ce café (menu, apparence, partage, fidélité, caisse, réglages, stats) — exactement comme le propriétaire.</p>
                  <button
                    onClick={() => manageAs(b.id)}
                    disabled={loading === `manage-${b.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading === `manage-${b.id}` ? 'Ouverture…' : 'Ouvrir l’admin complet →'}
                  </button>
                </div>

                {/* Profile */}
                <Section title="Profil">
                  {editingProfile ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">Nom de l’établissement</label>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom de l’établissement" maxLength={100} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">Adresse e-mail</label>
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="example@email.com" className={inputClass} dir="ltr" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">Numéro de téléphone</label>
                        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+21612345678" className={inputClass} dir="ltr" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={() => handleSaveProfile(b.id)} disabled={loading === `profile-${b.id}`}>
                          {loading === `profile-${b.id}` ? 'En cours…' : 'Enregistrer'}
                        </Button>
                        <Button variant="neutral" onClick={() => setEditingProfile(false)} disabled={loading === `profile-${b.id}`}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm">
                      <Row label="Nom"><span className="text-zinc-900">{b.name}</span></Row>
                      <Row label="E-mail">{b.profiles?.email ? <span dir="ltr" className="text-zinc-900">{b.profiles.email}</span> : <span className="text-zinc-400">Non disponible</span>}</Row>
                      <Row label="Téléphone">{b.profiles?.phone_number ? <span dir="ltr" className="text-zinc-900">{b.profiles.phone_number}</span> : <span className="text-zinc-400">Non disponible</span>}</Row>
                      <Row label="Pays"><span className="text-zinc-900">{b.country || 'Non défini'}</span></Row>
                      <Row label="Devise"><span className="text-zinc-900">{b.currency || 'Non défini'}</span></Row>
                      <Row label="Lien"><a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline" dir="ltr">/{b.slug}</a></Row>
                      <button onClick={() => startEditProfile(b)} className="pt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Modifier le profil</button>
                    </div>
                  )}
                </Section>

                {/* Menu — full management (categories, items, images) */}
                <Section title="Menu">
                  <a
                    href={`/super-admin/businesses/${b.id}/menu`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Gérer le menu — catégories, plats, photos →
                  </a>
                  <p className="mt-2 text-xs text-zinc-400">Gestion complète comme côté établissement, avec optimisation des images.</p>
                </Section>

                {/* Subscription / time */}
                <Section title="Abonnement">
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                    <span className="text-sm text-zinc-500">Expiration</span>
                    <span className={`text-sm font-semibold ${b.expires_at ? timeInfo?.color : 'text-zinc-500'}`}>
                      {b.expires_at ? (
                        <>{timeInfo?.text}{expiredButActive ? '' : ''} <span className="text-zinc-400" dir="ltr">· {new Date(b.expires_at).toLocaleDateString('fr-FR')}</span></>
                      ) : 'Illimité'}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-zinc-400">La durée ajoutée s’additionne au temps restant — aucun jour payé n’est perdu.</p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {extendPresets.map((p) => (
                      <button key={p.label} onClick={() => extendTime(b.id, p.days)} disabled={timeBusy}
                        className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-zinc-500">Jours personnalisés</label>
                      <input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} placeholder="ex. 14" className={inputClass} />
                    </div>
                    <Button variant="neutral" onClick={() => handleCustomExtend(b.id)} disabled={!extendDays || timeBusy}>Prolonger</Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Date exacte</label>
                      <input type="date" value={exactDate} onChange={(e) => setExactDate(e.target.value)} className={inputClass} />
                    </div>
                    <Button variant="neutral" onClick={() => setExactExpiry(b.id)} disabled={!exactDate || timeBusy}>Définir</Button>
                    <Button variant="ghost" onClick={() => setUnlimited(b.id)} disabled={timeBusy}>Illimité</Button>
                  </div>
                </Section>

                {/* State */}
                <Section title="État">
                  <div>
                    {b.status === 'active' ? (
                      suspendConfirm ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm text-amber-800">Le menu de <strong>« {b.name} »</strong> sera mis hors ligne. Le temps restant est conservé.</p>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setSuspendConfirm(false)} disabled={loading === `status-${b.id}`}>Annuler</Button>
                            <button onClick={() => setStatus(b.id, 'paused')} disabled={loading === `status-${b.id}`}
                              className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">
                              {loading === `status-${b.id}` ? 'En cours…' : 'Suspendre'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setSuspendConfirm(true)}
                          className="inline-flex min-h-[44px] items-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
                          Suspendre l’établissement
                        </button>
                      )
                    ) : (
                      <button onClick={() => setStatus(b.id, 'active')} disabled={loading === `status-${b.id}`}
                        className="inline-flex min-h-[44px] items-center rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50">
                        {loading === `status-${b.id}` ? 'En cours…' : 'Réactiver l’établissement'}
                      </button>
                    )}
                  </div>
                </Section>

                {/* Produits & accès — chaque produit en interrupteur on/off */}
                <Section title="Produits & accès">
                  {productMode === null || !ordering || !pos ? (
                    <div className="space-y-2"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="h-9 w-full rounded-xl" /></div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const menuOn = (productMode.products ?? null) !== 'fidelity'
                        const fidOn = (productMode.products ?? null) !== 'menu'
                        const calc = (m: boolean, f: boolean): string | null => (m && f ? 'both' : m ? 'menu' : f ? 'fidelity' : null)
                        return (
                          <>
                            <Toggle
                              checked={menuOn}
                              disabled={loading === `products-${b.id}`}
                              label="Menu QR"
                              hint="La carte numérique scannable."
                              onChange={(v) => { if (!v && !fidOn) { toast('Au moins un produit doit rester actif.', 'error'); return } patchProducts(b.id, calc(v, fidOn), 'Produits mis à jour.') }}
                            />
                            <Toggle
                              checked={fidOn}
                              disabled={loading === `products-${b.id}`}
                              label="Fidélité"
                              hint="Points, roue de la chance et récompenses."
                              onChange={(v) => { if (!v && !menuOn) { toast('Au moins un produit doit rester actif.', 'error'); return } patchProducts(b.id, calc(menuOn, v), 'Produits mis à jour.') }}
                            />
                          </>
                        )
                      })()}
                      <div className="space-y-3 border-t border-zinc-100 pt-3">
                        <Toggle
                          checked={ordering.enabled}
                          disabled={loading === `ordering-${b.id}`}
                          label="Commande à table"
                          hint="Les clients commandent depuis leur table (QR par table)."
                          onChange={(v) => patchOrdering(b.id, { enabled: v }, v ? 'Commande à table activée.' : 'Commande à table désactivée.')}
                        />
                        <Toggle
                          checked={pos.enabled}
                          disabled={loading === `pos-${b.id}`}
                          label="Caisse POS"
                          hint="Terminal de vente /pos (produit séparé, facturé à part)."
                          onChange={(v) => patchPos(b.id, v)}
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-400">
                        Active ou désactive chaque produit pour ce café. Le client et le propriétaire ne voient que ce qui est activé.
                      </p>
                    </div>
                  )}
                </Section>

                {/* Logo */}
                <Section title="Logo">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      {b.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo_url} alt={`Logo ${b.name}`} className="h-full w-full object-contain" />
                      ) : (
                        <span className="px-1 text-center text-[10px] leading-tight text-zinc-400">Aucun logo</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={`inline-flex cursor-pointer items-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 ${logoBusy ? 'pointer-events-none opacity-50' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={logoBusy}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(b.id, f); e.currentTarget.value = '' }}
                        />
                        {logoBusy ? 'Téléversement…' : b.logo_url ? 'Modifier le logo' : 'Téléverser un logo'}
                      </label>
                      {b.logo_url && !logoBusy && (
                        removeLogoConfirm ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-zinc-500">Retirer le logo ?</span>
                            <button onClick={() => removeLogo(b.id)} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700">Confirmer</button>
                            <button onClick={() => setRemoveLogoConfirm(false)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-700">Annuler</button>
                          </div>
                        ) : (
                          <button onClick={() => setRemoveLogoConfirm(true)} className="mt-2 block text-xs font-semibold text-zinc-400 transition hover:text-red-600">Retirer le logo</button>
                        )
                      )}
                      <p className="mt-2 text-[11px] text-zinc-400">PNG ou JPG, max 5 Mo — optimisé automatiquement, visible aussitôt sur la page publique.</p>
                    </div>
                  </div>
                </Section>

                {/* Design du menu (modèle + couleur) */}
                <Section title="Design du menu">
                  <p className="mb-3 text-xs text-zinc-400">
                    Modèle de menu et couleur principale de ce café — visible aussitôt sur sa page publique.
                  </p>
                  <div className="mb-5">
                    <div className="flex items-center gap-3">
                      <label htmlFor={`color-${b.id}`} className="text-sm font-medium text-zinc-600">Couleur principale</label>
                      <input
                        id={`color-${b.id}`}
                        type="color"
                        value={effectiveAccent(b)}
                        disabled={gradientOn(b)}
                        onChange={(e) => applyLocalColor(b.id, e.target.value)}
                        onBlur={(e) => commitColor(b.id, e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Couleur principale"
                      />
                      <span className="font-mono text-xs text-zinc-400">{effectiveAccent(b).toUpperCase()}</span>
                    </div>
                    {gradientOn(b) && <p className="mt-1.5 text-[11px] text-zinc-400">Désactivé en mode dégradé — modifiez les couleurs du dégradé ci-dessous.</p>}
                  </div>
                  <MenuDesignPicker
                    themeCtrl={{
                      activeId: b.theme_id || 'design1',
                      onSelect: (themeId) => selectTheme(b.id, themeId),
                      savingId: themeSaving,
                      savedId: themeSaved,
                      error: designError,
                    } as ThemeCtrl}
                    slug={b.slug}
                    accent={effectiveAccent(b)}
                  />
                  {isDesignId(b.theme_id || 'design1') && (() => {
                    const theme = (b.theme_id || 'design1') as DesignId
                    const ds = getDesignSettings(b, theme)
                    return (
                      <div className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Apparence avancée</p>
                        <Toggle
                          checked={!!ds.gradientEnabled}
                          onChange={(v) => commitSettings(b.id, { gradientEnabled: v })}
                          label="Mode dégradé"
                          hint="Remplace la couleur plate par un dégradé sur tout le menu."
                        />
                        {ds.gradientEnabled && (
                          <div className="flex items-center gap-2 pl-1">
                            <input type="color" value={ds.gradientFrom || '#F47B20'} onChange={(e) => applyLocalSettings(b.id, { gradientFrom: e.target.value })} onBlur={(e) => commitSettings(b.id, { gradientFrom: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5" aria-label="Couleur de départ" />
                            <span className="text-xs text-zinc-400">→</span>
                            <input type="color" value={ds.gradientTo || '#F5B82E'} onChange={(e) => applyLocalSettings(b.id, { gradientTo: e.target.value })} onBlur={(e) => commitSettings(b.id, { gradientTo: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5" aria-label="Couleur de fin" />
                          </div>
                        )}
                        <Toggle
                          checked={ds.showcase !== false}
                          onChange={(v) => commitSettings(b.id, { showcase: v })}
                          label="Vitrine « À la une »"
                          hint="Carrousel des plats mis en avant en haut du menu."
                        />
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-600">Slogan (tagline)</label>
                          <input
                            key={`tagline-${b.id}-${theme}`}
                            className={inputClass}
                            defaultValue={ds.tagline || ''}
                            onBlur={(e) => commitSettings(b.id, { tagline: e.target.value })}
                            placeholder="Ex. Bienvenue chez nous"
                            maxLength={200}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </Section>

                {/* QR scan-to-play gate */}
                <Section title="Scan QR pour jouer">
                  {qrGate === null ? (
                    <div className="space-y-2"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="h-9 w-2/3 rounded-xl" /></div>
                  ) : !qrGate.exists ? (
                    <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                      Ce café n’a pas encore configuré la roue — rien à verrouiller pour l’instant.
                    </p>
                  ) : (
                    <>
                      <Toggle
                        checked={Boolean(qrGate.enabled)}
                        onChange={(v) => patchQrGate(b.id, { enabled: v }, v ? 'Scan du QR requis pour jouer.' : 'Scan du QR non requis.')}
                        disabled={loading === `qr-${b.id}`}
                        label="Exiger le scan du QR"
                        hint="Le client doit avoir scanné le QR du café récemment pour tourner la roue."
                      />
                      {qrGate.enabled && (
                        <>
                          <div className="mt-4">
                            <p className="text-xs font-medium text-zinc-600">Validité d’un scan</p>
                            <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 p-1">
                              {QR_TTL_OPTIONS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => patchQrGate(b.id, { ttlMin: m }, `Validité réglée sur ${ttlLabel(m)}.`)}
                                  disabled={loading === `qr-${b.id}`}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${qrGate.ttlMin === m ? 'bg-orange-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                                >
                                  {ttlLabel(m)}
                                </button>
                              ))}
                            </div>
                            <p className="mt-1.5 text-[11px] text-zinc-400">Au-delà, le client doit re-scanner le QR pour rejouer.</p>
                          </div>

                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-[12px] leading-relaxed text-amber-800">
                              ⚠️ Après activation ou régénération, le café doit <strong>ré-imprimer son QR</strong> depuis Partage, sinon l’ancien QR ne débloque plus la roue.
                            </p>
                            <div className="mt-2">
                              {qrRegenConfirm ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-amber-800">Régénérer la clé ? L’ancien QR cessera de fonctionner.</span>
                                  <button
                                    onClick={() => patchQrGate(b.id, { regen: true }, 'Nouvelle clé QR générée.')}
                                    disabled={loading === `qr-${b.id}`}
                                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                                  >
                                    {loading === `qr-${b.id}` ? 'En cours…' : 'Confirmer'}
                                  </button>
                                  <button onClick={() => setQrRegenConfirm(false)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-700">Annuler</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setQrRegenConfirm(true)}
                                  disabled={loading === `qr-${b.id}`}
                                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                >
                                  ↻ Régénérer la clé du QR
                                </button>
                              )}
                            </div>
                          </div>

                          {qrGate.gameActive === false && (
                            <p className="mt-3 text-[12px] text-zinc-400">
                              Note : la roue de ce café est inactive — le verrou s’appliquera dès qu’elle sera activée.
                            </p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Section>

                {/* Danger zone */}
                <Section title="Zone de danger">
                  {deleteConfirm ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="mb-3 text-sm text-red-700">
                        Action <strong>irréversible</strong> : toutes les données (catégories, articles, abonnements, images) seront supprimées. Saisissez le nom exact pour confirmer : <strong dir="ltr">{b.name}</strong>
                      </p>
                      <input type="text" value={deleteNameInput} onChange={(e) => setDeleteNameInput(e.target.value)} placeholder="Nom exact de l’établissement"
                        className="mb-3 w-full rounded-xl border border-red-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/40" dir="ltr" />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => { setDeleteConfirm(false); setDeleteNameInput('') }} disabled={loading === `delete-${b.id}`}>Annuler</Button>
                        <button onClick={() => handleDeleteBusiness(b)} disabled={loading === `delete-${b.id}` || deleteNameInput.trim() !== b.name}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                          {loading === `delete-${b.id}` ? (<><Spinner /> Suppression…</>) : 'Supprimer définitivement'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)} className="text-sm font-medium text-zinc-400 transition hover:text-red-600">
                      Supprimer ce compte
                    </button>
                  )}
                </Section>
              </div>
            )
          })()}
        </DetailSheet>
      )}
    </div>
  )
}

/* ── presentational helpers ──────────────────────────────────────── */
function DetailSheet({ business, onClose, children }: { business: Business; onClose: () => void; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape to close, Tab trapped within the panel, focus moved in on open and
  // restored to the previously-focused element on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Détails de l’établissement ${business.name}`}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
              style={{ background: business.primary_color || '#F47B20' }}
              aria-hidden="true"
            >
              {business.name?.trim()?.[0]?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-zinc-900">{business.name}</h2>
                <StatusChip status={business.status} />
              </div>
              <p className="truncate text-xs text-zinc-400" dir="ltr">/{business.slug}</p>
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-zinc-600"><span className="text-zinc-400">{label} :</span> {children}</p>
  )
}

function StatusChip({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-700'}`}>
      {active ? 'Actif' : 'Suspendu'}
    </span>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
