'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { revalidatePublicMenu } from '@/lib/revalidate-menu'
import MenuDesignPicker, { type ThemeCtrl } from './MenuDesignPicker'
import {
  ClassicColorForm,
  ModelControls,
  isDesign,
  useDesignSettings,
  type DesignSettingsController,
} from './DesignSettings'
import ColorsTab from './design/ColorsTab'
import BrandTab from './design/BrandTab'
import { resolveAccent, resolveGradient, type DesignId, type DesignSettings as Settings } from '@/lib/design-settings'

type TabId = 'model' | 'colors' | 'brand'

const TABS: { id: TabId; label: string }[] = [
  { id: 'model', label: 'Modèle' },
  { id: 'colors', label: 'Couleurs & dégradé' },
  { id: 'brand', label: 'Marque' },
]

/**
 * The "Design" control panel: a tabbed editor (Modèle | Couleurs & dégradé |
 * Marque) on the left with a sticky live phone preview on the right. The active
 * design's in-progress settings live in the keyed <DesignWorkspace> so the
 * preview reflects unsaved colour/name/logo changes instantly.
 */
export default function DesignStudio({ business }: { business: any }) {
  const supabase = createClient()
  const [activeDesign, setActiveDesign] = useState<string>(business.theme_id)
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>(
    business.design_settings && typeof business.design_settings === 'object'
      ? { ...business.design_settings }
      : {}
  )
  const [tab, setTab] = useState<TabId>('model')

  // Deep-link support: /admin/theme?tab=brand|colors|model opens that tab on
  // load (e.g. the "Ajoutez votre logo" onboarding step links straight to
  // Marque). Done in an effect so SSR/first paint match, then switch on mount.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'brand' || t === 'colors' || t === 'model') setTab(t)
  }, [])

  // Lifted brand fields so name/logo edits in the Marque tab update the preview live.
  const [bizName, setBizName] = useState<string>(business.name || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url || null)

  // Theme selection lives HERE (not in the picker) — DesignStudio never remounts,
  // so the optimistic highlight + the DB write survive the keyed workspace
  // remount that selecting a design triggers. This is what makes it one-tap.
  const [themeSavingId, setThemeSavingId] = useState<string | null>(null)
  const [themeSavedId, setThemeSavedId] = useState<string | null>(null)
  const [themeError, setThemeError] = useState<string | null>(null)

  async function selectTheme(id: string) {
    if (id === activeDesign || themeSavingId) return
    const previous = activeDesign
    setActiveDesign(id) // optimistic — instant highlight, switches the workspace
    setThemeSavingId(id)
    setThemeError(null)
    setThemeSavedId(null)
    try {
      const { data, error } = await (supabase.from('businesses') as any)
        .update({ theme_id: id })
        .eq('id', business.id)
        .select('id')
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) throw new Error("La modification n'a pas pu être enregistrée. Vérifiez vos accès.")
      revalidatePublicMenu() // a new design changes the whole menu — push it live now
      setThemeSavedId(id)
      setTimeout(() => setThemeSavedId((cur) => (cur === id ? null : cur)), 2000)
    } catch (err: any) {
      setActiveDesign(previous) // revert on failure
      setThemeError(err?.message || 'Une erreur est survenue.')
    } finally {
      setThemeSavingId(null)
    }
  }

  const themeCtrl: ThemeCtrl = {
    activeId: activeDesign,
    onSelect: selectTheme,
    savingId: themeSavingId,
    savedId: themeSavedId,
    error: themeError,
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Design</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Marque partagée + apparence du menu, avec aperçu en direct.
        </p>
      </div>

      {/* Tabs — sticky so you never scroll back up to switch sections */}
      <div className="sticky top-14 z-30 -mx-4 mb-6 bg-zinc-50/95 px-4 py-2 backdrop-blur">
      <div role="tablist" aria-label="Sections du design" className="inline-flex w-full gap-1 rounded-2xl bg-zinc-100 p-1 sm:w-auto">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              id={`design-tab-${t.id}`}
              aria-controls={`design-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                active ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      </div>

      {isDesign(activeDesign) ? (
        <DesignWorkspace
          key={activeDesign}
          business={business}
          designId={activeDesign}
          settingsMap={settingsMap}
          onSaved={(id, s) => setSettingsMap((m) => ({ ...m, [id]: s }))}
          tab={tab}
          bizName={bizName}
          logoUrl={logoUrl}
          themeCtrl={themeCtrl}
          onLogoUpdated={(url) => setLogoUrl(url || null)}
          onNameUpdated={setBizName}
        />
      ) : (
        <ClassicWorkspace
          business={business}
          tab={tab}
          bizName={bizName}
          logoUrl={logoUrl}
          themeCtrl={themeCtrl}
          onLogoUpdated={(url) => setLogoUrl(url || null)}
          onNameUpdated={setBizName}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-design workspace: owns the in-progress settings + the preview. */
/* ------------------------------------------------------------------ */

function DesignWorkspace({
  business,
  designId,
  settingsMap,
  onSaved,
  tab,
  bizName,
  logoUrl,
  themeCtrl,
  onLogoUpdated,
  onNameUpdated,
}: {
  business: any
  designId: DesignId
  settingsMap: Record<string, any>
  onSaved: (id: string, s: Settings) => void
  tab: TabId
  bizName: string
  logoUrl: string | null
  themeCtrl: ThemeCtrl
  onLogoUpdated: (url: string) => void
  onNameUpdated: (name: string) => void
}) {
  const ctrl = useDesignSettings(business, designId, settingsMap, onSaved)
  const accent = resolveAccent(ctrl.s, designId)
  const gradient = resolveGradient(ctrl.s, designId)

  return (
    <>
    <div className="space-y-6">
      <TabPanel id="model" active={tab === 'model'}>
        <div className="space-y-6">
          <MenuDesignPicker
            themeCtrl={themeCtrl}
            slug={business.slug}
            accent={accent}
            gradient={gradient}
          />
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:p-6">
            <h3 className="mb-4 text-lg font-bold text-zinc-900">Réglages du design</h3>
            <ModelControls ctrl={ctrl} designId={designId} />
          </div>
        </div>
      </TabPanel>

      <TabPanel id="colors" active={tab === 'colors'}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:p-6">
          <ColorsTab ctrl={ctrl} designId={designId} />
        </div>
      </TabPanel>

      <TabPanel id="brand" active={tab === 'brand'}>
        <BrandTab
          business={{ id: business.id, name: bizName, logo_url: logoUrl }}
          onLogoUpdated={onLogoUpdated}
          onNameUpdated={onNameUpdated}
        />
      </TabPanel>
    </div>
    {(tab === 'model' || tab === 'colors') && <FloatingSave ctrl={ctrl} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Classic-theme workspace (classic / minimal / dark): primary colour */
/*  only, plus the shared Marque tab. No gradient / per-design extras.  */
/* ------------------------------------------------------------------ */

function ClassicWorkspace({
  business,
  tab,
  bizName,
  logoUrl,
  themeCtrl,
  onLogoUpdated,
  onNameUpdated,
}: {
  business: any
  tab: TabId
  bizName: string
  logoUrl: string | null
  themeCtrl: ThemeCtrl
  onLogoUpdated: (url: string) => void
  onNameUpdated: (name: string) => void
}) {
  return (
    <div className="space-y-6">
      <TabPanel id="model" active={tab === 'model'}>
        <div className="space-y-6">
          <MenuDesignPicker
            themeCtrl={themeCtrl}
            slug={business.slug}
            accent={business.primary_color || '#F47B20'}
          />
        </div>
      </TabPanel>

      <TabPanel id="colors" active={tab === 'colors'}>
        <ClassicColorForm businessId={business.id} />
      </TabPanel>

      <TabPanel id="brand" active={tab === 'brand'}>
        <BrandTab
          business={{ id: business.id, name: bizName, logo_url: logoUrl }}
          onLogoUpdated={onLogoUpdated}
          onNameUpdated={onNameUpdated}
        />
      </TabPanel>
    </div>
  )
}

/* ---------- layout + small helpers ---------- */

function TabPanel({ id, active, children }: { id: TabId; active: boolean; children: React.ReactNode }) {
  if (!active) return null
  return (
    <div role="tabpanel" id={`design-panel-${id}`} aria-labelledby={`design-tab-${id}`}>
      {children}
    </div>
  )
}

/** Always-visible, floating save for the per-design settings (Modèle + Couleurs). */
function FloatingSave({ ctrl }: { ctrl: DesignSettingsController }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {ctrl.error && (
        <div className="max-w-[16rem] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-lg">
          {ctrl.error}
        </div>
      )}
      <button
        type="button"
        onClick={ctrl.save}
        disabled={ctrl.saving}
        aria-label="Enregistrer les réglages du design"
        className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_-8px_rgba(244,123,32,0.7)] transition active:scale-95 disabled:opacity-70 ${
          ctrl.saved ? 'bg-green-600' : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        {ctrl.saved ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Enregistré
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            {ctrl.saving ? 'Enregistrement…' : 'Enregistrer'}
          </>
        )}
      </button>
    </div>
  )
}
