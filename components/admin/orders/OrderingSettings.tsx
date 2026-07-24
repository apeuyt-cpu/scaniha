'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Card from '@/components/admin/kit/Card'
import Toggle from '@/components/admin/kit/Toggle'
import { useToast } from '@/components/admin/kit/Toast'

interface OrderingConfig {
  enabled: boolean
  qrKey: string
  ttlMin: number
  tables: number
  gpsOnly?: boolean
  gpsLat?: number | null
  gpsLng?: number | null
  gpsRadius?: number
}

type TableTarget = { table: number; url: string }

/**
 * Owner setup for "Commande à table": flip ordering on/off, choose how many
 * numbered tables, and print one QR per table. Lifted from the legacy
 * /admin/commandes/reglages page so it can live as a tab inside Commandes.
 * `onChange` lets the parent refresh its gating after an enable/disable.
 */
export default function OrderingSettings({ onChange }: { onChange?: (c: OrderingConfig) => void }) {
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<OrderingConfig>({ enabled: false, qrKey: '', ttlMin: 120, tables: 0, gpsOnly: false, gpsLat: null, gpsLng: null, gpsRadius: 100 })
  const [tablesInput, setTablesInput] = useState('1')
  const [origin, setOrigin] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [confirmingRotate, setConfirmingRotate] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [tableTargets, setTableTargets] = useState<TableTarget[]>([])

  useEffect(() => {
    try { setOrigin(window.location.origin) } catch {}
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const bizRes = await fetch('/api/admin/business')
        if (bizRes.ok && bizRes.headers.get('content-type')?.includes('application/json')) {
          const b = await bizRes.json()
          if (alive && typeof b?.slug === 'string') setSlug(b.slug)
          if (alive && typeof b?.name === 'string') setName(b.name)
        } else if (bizRes.status === 401 || bizRes.status === 403) {
          window.location.href = '/login'
          return
        }

        const res = await fetch('/api/admin/ordering')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const c = (await res.json()) as OrderingConfig
          if (alive) {
            setConfig(c)
            setTablesInput(String(c.tables > 0 ? c.tables : 1))
          }
          const targetRes = await fetch('/api/admin/ordering/qr-targets')
          if (targetRes.ok) {
            const payload = await targetRes.json()
            if (alive && Array.isArray(payload?.targets)) setTableTargets(payload.targets)
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

  async function save(patch: { enabled?: boolean; tables?: number; regen?: boolean; gpsOnly?: boolean; gpsLat?: number | null; gpsLng?: number | null; gpsRadius?: number }) {
    const nextEnabled = patch.enabled !== undefined ? patch.enabled : config.enabled
    const body: { enabled: boolean; tables?: number; regen?: boolean; gpsOnly?: boolean; gpsLat?: number | null; gpsLng?: number | null; gpsRadius?: number } = { enabled: nextEnabled }
    if (patch.tables !== undefined) body.tables = patch.tables
    if (patch.regen) body.regen = true
    if (patch.gpsOnly !== undefined) body.gpsOnly = patch.gpsOnly
    if (patch.gpsLat !== undefined) body.gpsLat = patch.gpsLat
    if (patch.gpsLng !== undefined) body.gpsLng = patch.gpsLng
    if (patch.gpsRadius !== undefined) body.gpsRadius = patch.gpsRadius

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
      const targetRes = await fetch('/api/admin/ordering/qr-targets')
      if (targetRes.ok) {
        const payload = await targetRes.json()
        if (Array.isArray(payload?.targets)) setTableTargets(payload.targets)
      }
      onChange?.(c)
      success('Réglages enregistrés.')
    } catch (e) {
      console.error(e)
      error("Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  function toggleEnabled(next: boolean) {
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

  async function rotateKey() {
    setConfirmingRotate(false)
    await save({ enabled: true, regen: true })
    error('Nouvelle clé générée — réimprimez tous les QR (les anciens ne fonctionnent plus).')
  }

  // Open a print-ready sheet with every table QR (one window.print for all).
  async function printAll() {
    if (!origin || !slug || !config.qrKey || config.tables < 1) return
    const targets = new Map(tableTargets.map((target) => [target.table, target.url]))
    if (targets.size < config.tables) { error('Les QR sont encore en préparation. Réessayez dans un instant.'); return }
    setPrinting(true)
    try {
      const nums = buildTableNumbers(config.tables)
      const qrs = await Promise.all(
        nums.map(async (n) => ({
          n,
          src: await QRCode.toDataURL(targets.get(n)!, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } }),
        }))
      )
      const w = window.open('', '_blank')
      if (!w) { error('Autorisez les pop-ups pour imprimer.'); return }
      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
      const title = esc(name || 'Commande à table')
      const cards = qrs
        .map((q) => `<div class="c"><img src="${q.src}" alt="Table ${q.n}"/><p class="t">Table ${q.n}</p><p class="s">Scannez pour commander</p></div>`)
        .join('')
      w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR tables — ${title}</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;padding:18px;color:#18181b}h1{font-size:18px;margin:0 0 14px;text-align:center}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.c{border:1px solid #e5e5e5;border-radius:14px;padding:12px;text-align:center;page-break-inside:avoid;break-inside:avoid}.c img{width:100%;height:auto;display:block}.t{font-weight:700;font-size:15px;margin:8px 0 2px}.s{font-size:11px;color:#6b7280;margin:0}@media print{body{padding:0}.g{gap:10px}}</style></head><body><h1>${title} — QR des tables</h1><div class="g">${cards}</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`)
      w.document.close()
    } catch (e) {
      console.error(e)
      error('Impossible de générer les QR.')
    } finally {
      setPrinting(false)
    }
  }

  const showQrs = config.enabled && Boolean(config.qrKey) && config.tables > 0

  return (
    <div className="space-y-4">
      <Card>
        <Toggle
          checked={config.enabled}
          onChange={toggleEnabled}
          disabled={loading || saving}
          label="Commande à table"
          hint="Permet aux clients présents de commander depuis leur table."
        />

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <label htmlFor="tables-count" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Nombre de tables
          </label>
          <p className="mb-2 text-xs text-[var(--muted)]">Un QR sera généré pour chaque table (de 1 à 200).</p>
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
            className="w-32 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 disabled:opacity-50"
          />
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <Toggle
            checked={!!config.gpsOnly}
            onChange={(checked) => save({ gpsOnly: checked })}
            disabled={loading || saving}
            label="Limiter aux clients sur place (GPS)"
            hint="Empêche les commandes factices en exigeant que le client soit physiquement au restaurant."
          />
          {config.gpsOnly && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm text-zinc-600 mb-3">
                Pour vérifier que le client est sur place, nous devons connaître la position GPS exacte de votre établissement.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Latitude</label>
                  <input 
                    type="number" step="any"
                    value={config.gpsLat ?? ''}
                    onChange={(e) => setConfig({...config, gpsLat: e.target.value ? parseFloat(e.target.value) : null})}
                    onBlur={() => save({ gpsLat: config.gpsLat })}
                    disabled={loading || saving}
                    placeholder="Ex: 48.8566"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Longitude</label>
                  <input 
                    type="number" step="any"
                    value={config.gpsLng ?? ''}
                    onChange={(e) => setConfig({...config, gpsLng: e.target.value ? parseFloat(e.target.value) : null})}
                    onBlur={() => save({ gpsLng: config.gpsLng })}
                    disabled={loading || saving}
                    placeholder="Ex: 2.3522"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  if ('geolocation' in navigator) {
                    setSaving(true)
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        save({ gpsLat: position.coords.latitude, gpsLng: position.coords.longitude })
                      },
                      (error) => {
                        setSaving(false)
                        console.error("GPS error", error)
                        alert("Impossible d'obtenir votre position. Vérifiez que la localisation est activée (et autorisée) sur votre appareil.")
                      },
                      { enableHighAccuracy: true, timeout: 10000 }
                    )
                  } else {
                    alert("La géolocalisation n'est pas supportée par votre navigateur (nécessite HTTPS).")
                  }
                }}
                disabled={loading || saving}
                className="w-full flex justify-center items-center gap-2 rounded-lg bg-white border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Définir ma position actuelle
              </button>
            </div>
          )}
        </div>
      </Card>

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-[var(--ink)]">QR codes des tables</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Chaque table a son QR. Le client scanne, commande depuis sa place — et seul un client
                présent (scan récent) peut commander.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={printAll}
                disabled={printing}
                className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:opacity-50"
              >
                {printing ? 'Préparation…' : 'Imprimer tout'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRotate(true)}
                disabled={saving}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Régénérer la clé
              </button>
            </div>
          </div>

          {confirmingRotate && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p>Régénérer la clé invalide <strong>tous les QR déjà imprimés</strong>. Vous devrez les réimprimer. Continuer&nbsp;?</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={rotateKey} disabled={saving} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">Régénérer</button>
                <button type="button" onClick={() => setConfirmingRotate(false)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">Annuler</button>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {buildTableNumbers(config.tables).map((n) => (
              <TableQr key={n} n={n} url={tableTargets.find((target) => target.table === n)?.url || ''} />
            ))}
          </div>
        </Card>
      ) : !config.enabled ? (
        <p className="rounded-xl border border-[var(--line)] bg-zinc-50 px-4 py-3 text-sm text-[var(--muted)]">
          Activez la commande à table pour générer et imprimer les QR codes de vos tables.
        </p>
      ) : null}
    </div>
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
    <div className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-white p-3">
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR de la table ${n}`} className="h-full w-full" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-zinc-100" />
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">Table {n}</p>
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
