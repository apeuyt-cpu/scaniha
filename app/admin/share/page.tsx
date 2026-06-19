'use client'

import { useEffect, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import { revalidatePublicMenu } from '@/lib/revalidate-menu'
import PageShell from '@/components/admin/ui/PageShell'
import Card from '@/components/admin/ui/Card'
import Toggle from '@/components/admin/ui/Toggle'
import { resolveMode, type ProductMode, type FidelityLanding } from '@/lib/design-settings'
import StaffAccessCard from '@/components/admin/StaffAccessCard'

type QrKind = 'menu' | 'fidelity'

const LANDINGS: { id: FidelityLanding; label: string }[] = [
  { id: 'carte', label: 'La carte' },
  { id: 'boutique', label: 'La boutique' },
  { id: 'roue', label: 'La roue' },
]

export default function SharePage() {
  const supabase = createClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [qrKey, setQrKey] = useState<string>('') // play key embedded in the QR when the gate is on
  const [gated, setGated] = useState(false)
  const [mode, setMode] = useState<ProductMode>('menu')
  const [origin, setOrigin] = useState('')

  // Owner QR-destination settings (persisted to design_settings).
  const [bizId, setBizId] = useState<string | null>(null)
  const [landing, setLanding] = useState<FidelityLanding>('carte')
  const [menuFid, setMenuFid] = useState(true)
  const [hasRoulette, setHasRoulette] = useState(false)
  const [savingLanding, setSavingLanding] = useState(false)
  const [savingMenuFid, setSavingMenuFid] = useState(false)
  const [staffTarget, setStaffTarget] = useState('/admin/caisse')
  const [savingStaff, setSavingStaff] = useState(false)

  useEffect(() => {
    try { setOrigin(window.location.origin) } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        let slg: string | null = null
        const res = await fetch('/api/admin/game')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const j = await res.json()
          slg = j.slug
          setSlug(j.slug)
          const g = j.config?.qrGate
          if (g && typeof g === 'object' && g.enabled && typeof g.qrKey === 'string' && g.qrKey) {
            setGated(true)
            setQrKey(g.qrKey)
          }
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
        // Product mode + current QR-destination settings.
        const bizRes = await fetch('/api/admin/business')
        if (bizRes.ok && bizRes.headers.get('content-type')?.includes('application/json')) {
          const b = await bizRes.json()
          setMode(resolveMode(b))
          setBizId(b.id ?? null)
          const ds = (b.design_settings && typeof b.design_settings === 'object' ? b.design_settings : {}) as any
          setLanding(ds.fidelityLanding === 'boutique' || ds.fidelityLanding === 'roue' ? ds.fidelityLanding : 'carte')
          setMenuFid(ds.menuShowsFidelity !== false)
          setStaffTarget(typeof ds.staffQrTarget === 'string' && ds.staffQrTarget.startsWith('/admin') ? ds.staffQrTarget : '/admin/caisse')
        }
        // Whether the roulette is on (so we only offer "La roue" as a landing).
        if (slg) {
          const gRes = await fetch(`/api/game/${slg}`)
          if (gRes.ok && gRes.headers.get('content-type')?.includes('application/json')) {
            setHasRoulette(Boolean((await gRes.json()).active))
          }
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // The menu and the loyalty program are two separate products → two separate QR
  // codes. A café that runs both gets one of each; menu-only / fidelity-only get
  // just the relevant one.
  const showMenu = mode === 'menu' || mode === 'both'
  const showFidelity = mode === 'fidelity' || mode === 'both'

  // Persist a design_settings patch (re-read first so sibling keys aren't clobbered).
  async function patchSettings(patch: Record<string, unknown>) {
    if (!bizId) return
    const { data: fresh } = await (supabase.from('businesses') as any).select('design_settings').eq('id', bizId).maybeSingle()
    const ds = fresh?.design_settings && typeof fresh.design_settings === 'object' ? fresh.design_settings : {}
    const { error } = await (supabase.from('businesses') as any).update({ design_settings: { ...ds, ...patch } }).eq('id', bizId)
    if (error) throw error
    revalidatePublicMenu() // push the routing change to the live menu/hub now
  }

  async function changeLanding(next: FidelityLanding) {
    const prev = landing
    setLanding(next)
    setSavingLanding(true)
    try { await patchSettings({ fidelityLanding: next }) } catch { setLanding(prev) } finally { setSavingLanding(false) }
  }
  async function changeMenuFid(next: boolean) {
    const prev = menuFid
    setMenuFid(next)
    setSavingMenuFid(true)
    try { await patchSettings({ menuShowsFidelity: next }) } catch { setMenuFid(prev) } finally { setSavingMenuFid(false) }
  }
  async function changeStaffTarget(next: string) {
    const prev = staffTarget
    setStaffTarget(next)
    setSavingStaff(true)
    try { await patchSettings({ staffQrTarget: next }) } catch { setStaffTarget(prev) } finally { setSavingStaff(false) }
  }

  // "Works for both" toggle — only meaningful when the café runs both products.
  const menuFooter = mode === 'both' ? (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <Toggle
        checked={menuFid}
        disabled={!bizId || savingMenuFid}
        onChange={changeMenuFid}
        label="Accès à la fidélité depuis le menu"
        hint={menuFid
          ? 'Ce QR ouvre le menu avec un onglet Fidélité en bas — un seul code pour les deux.'
          : 'Ce QR ouvre uniquement le menu. La fidélité reste accessible via son propre QR.'}
      />
    </div>
  ) : null

  // Landing-page picker for the fidelity QR (so the roulette isn't always the front door).
  const fidFooter = (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <p className="mb-2 text-sm font-medium text-zinc-700">Ce QR ouvre sur</p>
      <div className="flex flex-wrap gap-2">
        {LANDINGS.filter((l) => l.id !== 'roue' || hasRoulette).map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => changeLanding(l.id)}
            disabled={!bizId || savingLanding}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${landing === l.id ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">La première page que vos clients voient — par ex. la boutique des récompenses au lieu de la roue.</p>
    </div>
  )

  return (
    <PageShell title="Partage">
      <div className="space-y-4">
        {mode === 'both' && (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Deux codes séparés : un pour le <span className="font-semibold text-zinc-800">menu</span>, un pour la{' '}
            <span className="font-semibold text-zinc-800">fidélité</span>. Imprimez celui qui correspond à chaque emplacement.
          </p>
        )}
        {showMenu && <QrCard kind="menu" slug={slug} origin={origin} gated={gated} qrKey={qrKey} footer={menuFooter} />}
        {showFidelity && <QrCard kind="fidelity" slug={slug} origin={origin} gated={gated} qrKey={qrKey} footer={fidFooter} />}
        <StaffAccessCard origin={origin} target={staffTarget} onChange={changeStaffTarget} disabled={!bizId || savingStaff} />
      </div>
    </PageShell>
  )
}

/** One downloadable QR card for a single product (menu or fidelity). */
function QrCard({ kind, slug, origin, gated, qrKey, footer }: { kind: QrKind; slug: string | null; origin: string; gated: boolean; qrKey: string; footer?: ReactNode }) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const path = kind === 'menu' ? `/${slug}` : `/${slug}/fidelite`
  const plainUrl = slug && origin ? `${origin}${path}` : ''
  // The printed QR carries the play key (when the gate is on) so scanning mints a
  // play session; the copy-link below stays plain — sharing it must NOT grant play.
  const qrTarget = plainUrl ? `${plainUrl}${gated && qrKey ? `?s=${qrKey}` : ''}` : ''

  useEffect(() => {
    if (!qrTarget) { setQr(null); return }
    let alive = true
    QRCode.toDataURL(qrTarget, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } })
      .then((d) => { if (alive) setQr(d) })
      .catch((e) => console.error(e))
    return () => { alive = false }
  }, [qrTarget])

  const copy = () => {
    if (!plainUrl) return
    navigator.clipboard.writeText(plainUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const download = () => {
    if (!qr || !slug) return
    const a = document.createElement('a')
    a.download = `${slug}-${kind}-qr.png`
    a.href = qr
    a.click()
  }

  const title = kind === 'menu' ? 'Code QR du menu' : 'Code QR de la fidélité'
  const subtitle = kind === 'menu'
    ? 'Imprimez-le pour vos tables — vos clients scannent pour voir le menu.'
    : 'Imprimez-le pour le comptoir — vos clients scannent pour ouvrir leur carte de fidélité et jouer à la roue.'
  const linkLabel = kind === 'menu' ? 'Lien du menu' : 'Lien de la fidélité'
  const viewLabel = kind === 'menu' ? 'Voir le menu ↗' : 'Voir la fidélité ↗'
  const linkPath = kind === 'menu' ? `/${slug ?? '…'}` : `/${slug ?? '…'}/fidelite`

  return (
    <Card>
      <h2 className="font-bold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
      {gated && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          🔒 Le scan du QR est requis pour jouer. Ce code contient la clé de jeu — <span className="font-semibold">re-téléchargez-le et ré-imprimez-le</span> après chaque régénération de la clé.
        </p>
      )}
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={title} className="h-44 w-44" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-xl bg-zinc-100" />
          )}
        </div>
        <div className="w-full min-w-0 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">{linkLabel}</label>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-sm text-zinc-600" dir="ltr">{linkPath}</code>
              <button onClick={copy} disabled={!slug} className={`shrink-0 text-sm font-semibold disabled:opacity-50 ${copied ? 'text-green-600' : 'text-orange-600 hover:text-orange-700'}`}>
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            {gated && <p className="mt-1 text-[11px] text-zinc-400">Le lien copié ne contient pas la clé de jeu — seul le QR imprimé débloque la roue.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={download} disabled={!qr} className="rounded-xl bg-zinc-100 px-3 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-50">
              Télécharger
            </button>
            <a href={plainUrl || '#'} target="_blank" rel="noopener noreferrer" className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-white transition ${plainUrl ? 'bg-orange-500 hover:bg-orange-600' : 'pointer-events-none bg-zinc-300'}`}>
              {viewLabel}
            </a>
          </div>
        </div>
      </div>
      {footer}
    </Card>
  )
}
