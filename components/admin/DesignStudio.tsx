'use client'

import { useState } from 'react'
import MenuDesignPicker from './MenuDesignPicker'
import {
  ClassicColorForm,
  ModelControls,
  isDesign,
  useDesignSettings,
  type DesignSettingsController,
} from './DesignSettings'
import ColorsTab from './design/ColorsTab'
import BrandTab from './design/BrandTab'
import PhonePreview from './design/PhonePreview'
import type { DesignId, DesignSettings as Settings } from '@/lib/design-settings'

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
  const [activeDesign, setActiveDesign] = useState<string>(business.theme_id)
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>(
    business.design_settings && typeof business.design_settings === 'object'
      ? { ...business.design_settings }
      : {}
  )
  const [tab, setTab] = useState<TabId>('model')

  // Lifted brand fields so name/logo edits in the Marque tab update the preview live.
  const [bizName, setBizName] = useState<string>(business.name || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url || null)

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
          setActiveDesign={setActiveDesign}
          onLogoUpdated={(url) => setLogoUrl(url || null)}
          onNameUpdated={setBizName}
        />
      ) : (
        <ClassicWorkspace
          business={business}
          tab={tab}
          bizName={bizName}
          logoUrl={logoUrl}
          setActiveDesign={setActiveDesign}
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
  setActiveDesign,
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
  setActiveDesign: (id: string) => void
  onLogoUpdated: (url: string) => void
  onNameUpdated: (name: string) => void
}) {
  const ctrl = useDesignSettings(business, designId, settingsMap, onSaved)

  return (
    <TwoPane
      preview={
        <PhonePreview settings={ctrl.s} designId={designId} businessName={bizName} logoUrl={logoUrl} />
      }
    >
      <TabPanel id="model" active={tab === 'model'}>
        <div className="space-y-6">
          <MenuDesignPicker
            businessId={business.id}
            currentThemeId={business.theme_id}
            slug={business.slug}
            onSelect={setActiveDesign}
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
          <SaveBar ctrl={ctrl} />
        </div>
      </TabPanel>

      <TabPanel id="brand" active={tab === 'brand'}>
        <BrandTab
          business={{ id: business.id, name: bizName, logo_url: logoUrl }}
          onLogoUpdated={onLogoUpdated}
          onNameUpdated={onNameUpdated}
        />
      </TabPanel>
    </TwoPane>
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
  setActiveDesign,
  onLogoUpdated,
  onNameUpdated,
}: {
  business: any
  tab: TabId
  bizName: string
  logoUrl: string | null
  setActiveDesign: (id: string) => void
  onLogoUpdated: (url: string) => void
  onNameUpdated: (name: string) => void
}) {
  return (
    <div className="space-y-6">
      <TabPanel id="model" active={tab === 'model'}>
        <div className="space-y-6">
          <MenuDesignPicker
            businessId={business.id}
            currentThemeId={business.theme_id}
            slug={business.slug}
            onSelect={setActiveDesign}
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

function TwoPane({ children, preview }: { children: React.ReactNode; preview: React.ReactNode }) {
  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      {/* Preview: top on mobile, sticky right column on desktop */}
      <aside className="mb-6 lg:order-2 lg:mb-0 lg:w-[220px] lg:shrink-0">
        <div className="lg:sticky lg:top-20">{preview}</div>
      </aside>

      {/* Controls */}
      <div className="min-w-0 flex-1 lg:order-1">{children}</div>
    </div>
  )
}

function TabPanel({ id, active, children }: { id: TabId; active: boolean; children: React.ReactNode }) {
  if (!active) return null
  return (
    <div role="tabpanel" id={`design-panel-${id}`} aria-labelledby={`design-tab-${id}`}>
      {children}
    </div>
  )
}

function SaveBar({ ctrl }: { ctrl: DesignSettingsController }) {
  return (
    <>
      {ctrl.error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ctrl.error}</div>
      )}
      <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
        <button
          type="button"
          onClick={ctrl.save}
          disabled={ctrl.saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {ctrl.saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
        {ctrl.saved && <span className="text-sm font-medium text-green-600">Enregistré ✓</span>}
      </div>
    </>
  )
}
