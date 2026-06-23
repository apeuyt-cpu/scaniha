'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/admin/ui/PageShell'
import Card from '@/components/admin/ui/Card'
import Toggle from '@/components/admin/ui/Toggle'
import { useToast } from '@/components/admin/ui/Toast'

interface OrderingConfig {
  enabled: boolean
  qrKey: string
  ttlMin: number
  tables: number
}

/**
 * Owner setup for "Commande à table": flip ordering on/off, choose how many
 * numbered tables, and print one QR per table. Each table QR carries the café's
 * presence key (?s=) + the table number (?t=) — scanning mints the presence
 * cookie and lets ONLY a diner who's physically there order from their seat.
 */
export default function OrderingSettingsPage() {
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<OrderingConfig>({ enabled: false, qrKey: '', ttlMin: 120, tables: 0 })
  const [tablesInput, setTablesInput] = useState('1') // local string so the field can be edited freely
  const [origin, setOrigin] = useState('')
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    try { setOrigin(window.location.origin) } catch {}
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Load the slug from the business (same source app/admin/share uses).
        const bizRes = await fetch('/api/admin/business')
        if (bizRes.ok && bizRes.headers.get('content-type')?.includes('application/json')) {
          const b = await bizRes.json()
          if (alive && typeof b?.slug === 'string') setSlug(b.slug)
        } else if (bizRes.status === 401 || bizRes.status === 403) {
          window.location.href = '/login'
          return
        }

        // Load the current ordering config.
        const res = await fetch('/api/admin/ordering')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const c = (await res.json()) as OrderingConfig
          if (alive) {
            setConfig(c)
            setTablesInput(String(c.tables > 0 ? c.tables : 1))
          }
        }
      } catch (e) {
        console.error(e)
        if (alive) error('Impossible de charger les réglages.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [error])

  // Persist a config change; the server clamps + mints the qrKey on first enable.
  async function save(patch: { enabled?: boolean; tables?: number }) {
    const nextEnabled = patch.enabled !== undefined ? patch.enabled : config.enabled
    const body: { enabled: boolean; tables?: number } = { enabled: nextEnabled }
    if (patch.tables !== undefined) body.tables = patch.tables

    setSaving(true)
    try {
      const res = await fetch('/api/admin/ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('save failed')
      const c = (await res.json()) as OrderingConfig
      setConfig(c)
      setTablesInput(String(c.tables > 0 ? c.tables : 1))
      success('Réglages enregistrés.')
    } catch (e) {
      console.error(e)
      error("Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  function toggleEnabled(next: boolean) {
    // Enabling with no table count yet → default to the field's current value.
    const tables = next && config.tables < 1 ? Math.max(1, Number(tablesInput) || 1) : undefined
    save({ enabled: next, tables })
  }

  function commitTables() {
    let n = Math.round(Number(tablesInput))
    if (!Number.isFinite(n)) n = config.tables || 1
    n = Math.min(200, Math.max(1, n))
    setTablesInput(String(n))
    if (n !== config.tables) save({ tables: n })
  }

  const showQrs = config.enabled && Boolean(config.qrKey) && config.tables > 0

  return (
    <PageShell
      title="Commande — Réglages"
      subtitle="Activez la commande à table, puis imprimez un QR par table. Vos clients commandent depuis leur place."
    >
      <div className="space-y-4">
        {/* Activation + table count */}
        <Card>
          <Toggle
            checked={config.enabled}
            onChange={toggleEnabled}
            disabled={loading || saving}
            label="Commande à table"
            hint="Permet aux clients présents de commander depuis leur table."
          />

          <div className="mt-5 border-t border-zinc-100 pt-5">
            <label htmlFor="tables-count" className="mb-1 block text-sm font-medium text-zinc-800">
              Nombre de tables
            </label>
            <p className="mb-2 text-xs text-zinc-400">Un QR sera généré pour chaque table (de 1 à 200).</p>
            <input
              id="tables-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              step={1}
              value={tablesInput}
              disabled={loading || saving}
              onChange={(e) => setTablesInput(e.target.value)}
              onBlur={commitTables}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              className="w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
            />
          </div>
        </Card>

        {/* Per-table QR codes */}
        {loading ? (
          <Card>
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="h-44 animate-pulse rounded-2xl bg-zinc-100" />
              <div className="h-44 animate-pulse rounded-2xl bg-zinc-100" />
              <div className="h-44 animate-pulse rounded-2xl bg-zinc-100" />
            </div>
          </Card>
        ) : showQrs ? (
          <Card>
            <h2 className="font-bold text-zinc-900">QR codes des tables</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Chaque table a son QR. Le client scanne, commande depuis sa place — et seul un client
              présent (scan récent) peut commander.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {buildTableNumbers(config.tables).map((n) => (
                <TableQr
                  key={n}
                  n={n}
                  url={origin && slug ? `${origin}/${slug}?s=${config.qrKey}&t=${n}` : ''}
                />
              ))}
            </div>
          </Card>
        ) : !config.enabled ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
            Activez la commande à table pour générer et imprimer les QR codes de vos tables.
          </p>
        ) : null}
      </div>
    </PageShell>
  )
}

/** Build [1..count] without spread/Set (tsconfig es5). */
function buildTableNumbers(count: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= count; i++) out.push(i)
  return out
}

/** One small downloadable QR for a single table. */
function TableQr({ n, url }: { n: number; url: string }) {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!url) { setQr(null); return }
    let alive = true
    QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } })
      .then((d) => { if (alive) setQr(d) })
      .catch((e) => console.error(e))
    return () => { alive = false }
  }, [url])

  const download = () => {
    if (!qr) return
    const a = document.createElement('a')
    a.download = `table-${n}.png`
    a.href = qr
    a.click()
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR de la table ${n}`} className="h-full w-full" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-zinc-100" />
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-zinc-800">Table {n}</p>
      <button
        type="button"
        onClick={download}
        disabled={!qr}
        aria-label={`Télécharger le QR de la table ${n}`}
        className="mt-1.5 w-full rounded-lg bg-zinc-100 px-2 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-50"
      >
        Télécharger
      </button>
    </div>
  )
}
