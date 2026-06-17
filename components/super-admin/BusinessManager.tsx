'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from '@/lib/supabase/database.types'
import { useToast } from './Toast'
import Button from '@/components/admin/ui/Button'
import Toggle from '@/components/admin/ui/Toggle'
import { inputClass } from '@/components/admin/ui/Field'
import { QR_TTL_OPTIONS } from '@/lib/game'
import MenuDesignPicker, { type ThemeCtrl } from '@/components/admin/MenuDesignPicker'

type Business = Database['public']['Tables']['businesses']['Row'] & {
  wheel_enabled?: boolean
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
  const [businesses, setBusinesses] = useState(initial)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('expiry_asc')
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
  // Design (theme_id + primary_color) — both already on the business row.
  const [themeSaving, setThemeSaving] = useState<string | null>(null)
  const [themeSaved, setThemeSaved] = useState<string | null>(null)
  const [designError, setDesignError] = useState<string | null>(null)

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

  // ── Wheel ───────────────────────────────────────────────────────────
  const toggleWheel = async (business: Business) => {
    setLoading(`wheel-${business.id}`)
    const next = !business.wheel_enabled
    try {
      const res = await fetch(`/api/super-admin/businesses/${business.id}/wheel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wheel_enabled: next }),
      })
      if (!res.ok) {
        let msg = 'Échec de la mise à jour de la roue.'
        try { msg = (await res.json()).error || msg } catch {}
        throw new Error(msg)
      }
      setBusinesses((cur) => cur.map((b) => (b.id === business.id ? { ...b, wheel_enabled: next } : b)))
      toast(next ? 'Roue de la chance activée.' : 'Roue de la chance désactivée.', 'success')
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
      setTimeout(() => window.location.reload(), 1500)
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

  const filterChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'active', label: 'Actifs', count: counts.active },
    { key: 'expiring', label: 'Expire ≤7 j', count: counts.expiring },
    { key: 'expired', label: 'Expirés', count: counts.expired },
    { key: 'suspended', label: 'Suspendus', count: counts.suspended },
    { key: 'unlimited', label: 'Illimités', count: counts.unlimited },
  ]

  return (
    <div>
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total" value={counts.all} />
        <SummaryCard label="Actifs" value={counts.active} color="text-green-600" />
        <SummaryCard label="Expire ≤7 j" value={counts.expiring} color="text-amber-600" />
        <SummaryCard label="Expirés" value={counts.expired} color="text-red-600" />
        <SummaryCard label="Suspendus" value={counts.suspended} color="text-zinc-700" />
        <SummaryCard label="Illimités" value={counts.unlimited} color="text-zinc-700" />
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

      {/* Filter chips */}
      <div className="no-scrollbar mb-5 flex flex-wrap gap-2">
        {filterChips.map((chip) => {
          const active = statusFilter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => { setStatusFilter(chip.key); resetPage() }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {chip.label}
              <span className={`ml-1.5 text-xs ${active ? 'text-orange-600' : 'text-zinc-400'}`}>{chip.count}</span>
            </button>
          )
        })}
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
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-zinc-900">{business.name}</h3>
                  <StatusChip status={business.status} />
                  {expiredButActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expiré</span>}
                  {business.wheel_enabled && <span title="Roue activée" aria-label="Roue activée">🎡</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-400" dir="ltr">/{business.slug}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-medium ${business.expires_at ? timeInfo?.color : 'text-zinc-400'}`}>
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
                      <Row label="Lien"><a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline" dir="ltr">/{b.slug}</a></Row>
                      <button onClick={() => startEditProfile(b)} className="pt-1 text-xs font-semibold text-orange-600 hover:text-orange-700">Modifier le profil</button>
                    </div>
                  )}
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
                  <Toggle
                    checked={Boolean(b.wheel_enabled)}
                    onChange={() => toggleWheel(b)}
                    disabled={loading === `wheel-${b.id}`}
                    label="Roue de la chance"
                    hint="Autorise ce compte à utiliser la roue."
                  />
                  <div className="mt-4">
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

                {/* Produits (formule) */}
                <Section title="Produits (formule)">
                  {productMode === null ? (
                    <p className="text-sm text-zinc-400">Chargement…</p>
                  ) : (
                    <>
                      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 p-1">
                        {([
                          { v: null, label: 'Par défaut' },
                          { v: 'menu', label: 'Menu QR' },
                          { v: 'fidelity', label: 'Fidélité' },
                          { v: 'both', label: 'Les deux' },
                        ] as const).map((opt) => {
                          const active = (productMode.products ?? null) === opt.v
                          return (
                            <button
                              key={String(opt.v)}
                              type="button"
                              onClick={() => patchProducts(b.id, opt.v, `Formule : ${opt.label}.`)}
                              disabled={loading === `products-${b.id}`}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${active ? 'bg-orange-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                        Ce que le client voit en scannant : « Menu QR » (carte seule), « Fidélité » (carte de fidélité + roue, sans menu), « Les deux ». « Par défaut » = ancien comportement (menu + fidélité si l’owner l’active).
                      </p>
                    </>
                  )}
                </Section>

                {/* Design du menu (modèle + couleur) */}
                <Section title="Design du menu">
                  <p className="mb-3 text-xs text-zinc-400">
                    Modèle de menu et couleur principale de ce café — visible aussitôt sur sa page publique.
                  </p>
                  <div className="mb-5 flex items-center gap-3">
                    <label htmlFor={`color-${b.id}`} className="text-sm font-medium text-zinc-600">Couleur principale</label>
                    <input
                      id={`color-${b.id}`}
                      type="color"
                      value={b.primary_color || '#F47B20'}
                      onChange={(e) => setBusinesses((cur) => cur.map((x) => (x.id === b.id ? { ...x, primary_color: e.target.value } : x)))}
                      onBlur={(e) => patchDesign(b.id, { primary_color: e.target.value }, 'Couleur principale mise à jour.')}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5"
                      aria-label="Couleur principale"
                    />
                    <span className="font-mono text-xs text-zinc-400">{(b.primary_color || '#F47B20').toUpperCase()}</span>
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
                    accent={b.primary_color || '#F47B20'}
                  />
                </Section>

                {/* QR scan-to-play gate */}
                <Section title="Scan QR pour jouer">
                  {qrGate === null ? (
                    <p className="text-sm text-zinc-400">Chargement…</p>
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
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-zinc-900">{business.name}</h2>
              <StatusChip status={business.status} />
            </div>
            <p className="truncate text-xs text-zinc-400" dir="ltr">/{business.slug}</p>
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

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className={`text-2xl font-bold ${color || 'text-zinc-900'}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
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
