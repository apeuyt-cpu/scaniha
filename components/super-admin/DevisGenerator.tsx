'use client'

import { useEffect, useMemo, useState } from 'react'
import { PLANS, PAYMENT_METHODS, type PlanId } from '@/lib/payment-config'

/**
 * Devis (quote) generator for the platform operator: pick a plan + QR supports
 * for a café client and print a clean, professional A4 quote. Reuses the SAME
 * pricing source as the payment modal (lib/payment-config) so a price change in
 * one place updates the devis too. The PDF is produced by the browser's print
 * dialog ("Enregistrer au format PDF") — no extra dependency, perfect fidelity.
 */

const SELLER = {
  name: 'Scaniha',
  tagline: 'Menus QR & programme de fidélité',
  org: 'Rakiza Group',
  phone: '58 415 520 / 53 581 861',
  email: '',
  site: 'scaniha.com',
  country: 'Tunisie',
}

const inp =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20'
const lbl = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400'

type CustomLine = { id: string; desc: string; qty: number; unit: number; free?: boolean }
type Stand = { id: string; name: string; unit: number; qty: number; free: boolean }
type Biz = { id: string; name: string }

const num = (v: string, min = 0) => Math.max(min, Number(v) || 0)
const money = (n: number) => n.toFixed(n % 1 === 0 ? 0 : 2)
const fmtDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DevisGenerator({ businesses }: { businesses: Biz[] }) {
  // Client
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  // Meta (set after mount → no SSR/hydration mismatch on the timestamp)
  const [devisNo, setDevisNo] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [validityDays, setValidityDays] = useState(0)
  // Items — default to the standard offer (À vie + 20 supports offerts)
  const [plan, setPlan] = useState<PlanId | ''>('lifetime')
  const [stands, setStands] = useState<Stand[]>([{ id: 'support-default', name: 'Présentoir QR de table', unit: 8, qty: 20, free: true }])
  const [extraStandCost, setExtraStandCost] = useState(8)
  const [custom, setCustom] = useState<CustomLine[]>([])
  // Adjustments
  const [discount, setDiscount] = useState(0)
  const [tvaPct, setTvaPct] = useState(0)
  const [notes, setNotes] = useState('')
  // Header (émetteur) — editable so the operator can show the logo and hide/keep
  // any seller detail (e.g. clear « Société · pays » to drop "Rakiza Group · Tunisie").
  const [install2x, setInstall2x] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
  const [seller, setSeller] = useState({
    name: SELLER.name,
    tagline: SELLER.tagline,
    org: '',
    phone: SELLER.phone,
    email: SELLER.email,
    site: SELLER.site,
  })
  // Highlighted inclusions — shown to the client but NOT billed (one per line).
  const [includedText, setIncludedText] = useState('Thèmes premium\nSystème de fidélité\nMises à jour à vie')
  const included = includedText.split('\n').map((s) => s.trim()).filter(Boolean)

  useEffect(() => {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    setDateStr(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)
    setDevisNo(`DEV-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`)
  }, [])

  const setStand = (id: string, patch: Partial<Stand>) => setStands((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addStand = () => setStands((s) => [...s, { id: crypto.randomUUID(), name: '', unit: 0, qty: 0, free: false }])
  const removeStand = (id: string) => setStands((s) => s.filter((x) => x.id !== id))
  const addCustom = () => setCustom((c) => [...c, { id: crypto.randomUUID(), desc: '', qty: 1, unit: 0 }])
  const setCustomField = (id: string, patch: Partial<CustomLine>) =>
    setCustom((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((x) => x.id !== id))

  // One-tap preset: the standard offer (lifetime + 20 free supports, 8 TND each
  // beyond, payable in 2×). Leaves the client + header untouched so you just type
  // the name and print.
  const applyOffer = () => {
    setPlan('lifetime')
    setStands([{ id: crypto.randomUUID(), name: 'Présentoir QR de table', unit: 8, qty: 20, free: true }])
    setExtraStandCost(8)
    setInstall2x(true)
    setIncludedText('Thèmes premium\nSystème de fidélité\nMises à jour à vie')
    setCustom([])
    setDiscount(0)
    setTvaPct(0)
    setNotes('')
    setValidityDays(0)
  }

  const lines = useMemo(() => {
    const out: { key: string; desc: string; sub?: string; qty: number; unit: number; free?: boolean }[] = []
    if (plan) {
      const p = PLANS[plan]
      out.push({ key: 'plan', desc: `Abonnement Scaniha — ${p.label}`, sub: 'Menu QR, thèmes, roulette & fidélité', qty: 1, unit: p.price })
    }
    for (const st of stands) {
      if (st.qty > 0) out.push({ key: st.id, desc: st.name.trim() || 'Support', sub: 'Support QR', qty: st.qty, unit: st.free ? 0 : st.unit, free: st.free })
    }
    for (const c of custom) {
      if (c.desc.trim() || c.unit > 0 || c.free) out.push({ key: c.id, desc: c.desc.trim() || 'Ligne', qty: c.qty, unit: c.free ? 0 : c.unit, free: !!c.free })
    }
    return out
  }, [plan, stands, custom])

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit, 0)
  const afterDiscount = Math.max(0, subtotal - discount)
  const tva = afterDiscount * (tvaPct / 100)
  const total = afterDiscount + tva

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #devis-doc, #devis-doc * { visibility: visible !important; }
          #devis-doc {
            position: absolute !important; left: 0; top: 0; width: 100%;
            margin: 0 !important; box-shadow: none !important; outline: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ─────────── Controls (never printed) ─────────── */}
        <div className="no-print space-y-4">
          {/* One-tap preset — the standard "à vie + 20 supports offerts" offer */}
          <button
            type="button"
            onClick={applyOffer}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            Offre type — À vie + 20 supports offerts
          </button>

          {/* Client */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Client</h3>
            <div className="mt-3 space-y-3">
              {businesses.length > 0 && (
                <div>
                  <label className={lbl}>Pré-remplir depuis un compte</label>
                  <select
                    className={inp}
                    defaultValue=""
                    onChange={(e) => {
                      const b = businesses.find((x) => x.id === e.target.value)
                      if (b) setClientName(b.name)
                    }}
                  >
                    <option value="">— Saisie manuelle —</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Nom du client / établissement</label>
                <input className={inp} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Café Le Bon Goût" />
              </div>
              <div>
                <label className={lbl}>Contact (tél. / email)</label>
                <input className={inp} value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="+216 ..." />
              </div>
              <div>
                <label className={lbl}>Adresse</label>
                <input className={inp} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Rue, ville" />
              </div>
            </div>
          </section>

          {/* Émetteur / en-tête */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">En-tête (émetteur)</h3>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              Afficher le logo Scaniha
            </label>
            <div className="mt-3 space-y-2.5">
              <div><label className={lbl}>Nom{showLogo && <span className="font-normal normal-case text-zinc-300"> · remplacé par le logo</span>}</label><input className={inp} value={seller.name} onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))} /></div>
              <div><label className={lbl}>Sous-titre</label><input className={inp} value={seller.tagline} onChange={(e) => setSeller((s) => ({ ...s, tagline: e.target.value }))} /></div>
              <div><label className={lbl}>Société · pays <span className="font-normal normal-case text-zinc-300">· vide = masqué</span></label><input className={inp} value={seller.org} onChange={(e) => setSeller((s) => ({ ...s, org: e.target.value }))} placeholder="Rakiza Group · Tunisie" /></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div><label className={lbl}>Téléphone</label><input className={inp} value={seller.phone} onChange={(e) => setSeller((s) => ({ ...s, phone: e.target.value }))} /></div>
                <div><label className={lbl}>Site</label><input className={inp} value={seller.site} onChange={(e) => setSeller((s) => ({ ...s, site: e.target.value }))} /></div>
              </div>
              <div><label className={lbl}>Email</label><input className={inp} value={seller.email} onChange={(e) => setSeller((s) => ({ ...s, email: e.target.value }))} /></div>
            </div>
          </section>

          {/* Devis meta */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Devis</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Numéro</label>
                <input className={inp} value={devisNo} onChange={(e) => setDevisNo(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Date</label>
                <input type="date" className={inp} value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Validité (jours) <span className="font-normal normal-case text-zinc-300">· 0 = masquer</span></label>
                <input type="number" min={0} className={inp} value={validityDays} onChange={(e) => setValidityDays(num(e.target.value, 0))} />
              </div>
            </div>
          </section>

          {/* Plan */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Forfait</h3>
            <div className="mt-3 space-y-2">
              {(Object.values(PLANS)).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan((cur) => (cur === p.id ? '' : p.id))}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    plan === p.id ? 'border-orange-400 bg-orange-50/60 ring-1 ring-orange-300' : 'border-zinc-200 hover:border-orange-300'
                  }`}
                >
                  <span className="font-semibold text-zinc-900">{p.label}</span>
                  <span className="font-bold text-zinc-900">{p.price} TND</span>
                </button>
              ))}
              <p className="text-[11px] text-zinc-400">Cliquez à nouveau pour retirer le forfait (devis supports seuls).</p>
              <label className="mt-1 flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-[12px] font-medium text-zinc-700">
                <input type="checkbox" checked={install2x} onChange={(e) => setInstall2x(e.target.checked)} className="h-4 w-4 accent-orange-500" />
                Paiement en 2× — 2 mensualités de {money(PLANS.lifetime.price / 2)} TND
              </label>
            </div>
          </section>

          {/* Stands / supports — fully editable: your own names + prices */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Supports QR</h3>
              <button type="button" onClick={addStand} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200">+ Support</button>
            </div>
            <div className="mt-3 space-y-2">
              {stands.map((st) => (
                <div key={st.id} className={`rounded-xl border px-3 py-2 transition ${st.qty > 0 ? 'border-orange-300 bg-orange-50/40' : 'border-zinc-200'}`}>
                  <div className="flex items-center gap-1.5">
                    <input className={`${inp} flex-1`} placeholder="Nom du support" value={st.name} onChange={(e) => setStand(st.id, { name: e.target.value })} />
                    <button type="button" onClick={() => removeStand(st.id)} aria-label="Retirer" className="px-1.5 text-zinc-300 hover:text-red-500">✕</button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-zinc-500">P.U.
                      <input type="number" min={0} step="0.5" disabled={st.free} className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-40" value={st.unit} onChange={(e) => setStand(st.id, { unit: num(e.target.value) })} />
                      <span className="text-zinc-400">TND</span>
                    </label>
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={() => setStand(st.id, { qty: Math.max(0, st.qty - 1) })} disabled={st.qty === 0} className="h-7 w-7 rounded-lg border border-zinc-200 text-base font-bold text-zinc-600 disabled:opacity-40">−</button>
                      <input type="number" min={0} value={st.qty} onChange={(e) => setStand(st.id, { qty: num(e.target.value) })} className="h-7 w-12 rounded-lg border border-zinc-200 text-center text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-orange-500/30" />
                      <button type="button" onClick={() => setStand(st.id, { qty: st.qty + 1 })} className="h-7 w-7 rounded-lg border border-zinc-200 text-base font-bold text-zinc-600">+</button>
                    </div>
                  </div>
                  {st.qty > 0 && (
                    <button type="button" onClick={() => setStand(st.id, { free: !st.free })} aria-pressed={st.free} className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${st.free ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                      {st.free ? '✓ Offert (gratuit)' : 'Offrir gratuitement'}
                    </button>
                  )}
                </div>
              ))}
              {stands.length === 0 && <p className="py-2 text-center text-[12px] text-zinc-400">Aucun support — ajoutez-en un.</p>}
            </div>
            <div className="mt-3">
              <label className={lbl}>Coût d&apos;un support supplémentaire (TND) <span className="font-normal normal-case text-zinc-300">· 0 = aucune mention</span></label>
              <input type="number" min={0} step="0.5" className={inp} value={extraStandCost} onChange={(e) => setExtraStandCost(num(e.target.value))} />
            </div>
          </section>

          {/* Custom lines */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Lignes libres</h3>
              <button type="button" onClick={addCustom} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200">+ Ligne</button>
            </div>
            {custom.length > 0 && (
              <div className="mt-3 space-y-2">
                {custom.map((c) => (
                  <div key={c.id} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-2">
                    <div className="flex items-center gap-1.5">
                      <input className={`${inp} flex-1`} placeholder="Désignation" value={c.desc} onChange={(e) => setCustomField(c.id, { desc: e.target.value })} />
                      <button type="button" onClick={() => removeCustom(c.id)} aria-label="Retirer" className="px-1.5 text-zinc-300 hover:text-red-500">✕</button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-zinc-500">Qté
                        <input type="number" min={1} className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30" value={c.qty} onChange={(e) => setCustomField(c.id, { qty: num(e.target.value, 1) })} />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-zinc-500">P.U.
                        <input type="number" min={0} step="0.5" disabled={c.free} className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-40" value={c.unit} onChange={(e) => setCustomField(c.id, { unit: num(e.target.value) })} />
                      </label>
                      <button type="button" onClick={() => setCustomField(c.id, { free: !c.free })} aria-pressed={!!c.free} className={`ml-auto rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${c.free ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                        {c.free ? '✓ Offert' : 'Offrir'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Options incluses — highlighted on the quote but never billed */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Options incluses</h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">Mises en avant sur le devis sans être facturées. Une par ligne.</p>
            <textarea rows={5} className={`${inp} mt-3 resize-none`} value={includedText} onChange={(e) => setIncludedText(e.target.value)} />
          </section>

          {/* Adjustments */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Remise & TVA</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Remise (TND)</label>
                <input type="number" min={0} step="0.5" className={inp} value={discount} onChange={(e) => setDiscount(num(e.target.value))} />
              </div>
              <div>
                <label className={lbl}>TVA (%)</label>
                <input type="number" min={0} max={100} className={inp} value={tvaPct} onChange={(e) => setTvaPct(num(e.target.value))} />
              </div>
            </div>
          </section>

          {/* Conditions */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-bold text-zinc-900">Conditions / notes</h3>
            <textarea rows={3} className={`${inp} mt-3 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Laissez vide pour le texte par défaut." />
          </section>
        </div>

        {/* ─────────── Preview + print ─────────── */}
        <div>
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">Aperçu — « Télécharger le PDF » puis <span className="font-semibold text-zinc-700">Enregistrer au format PDF</span>.</p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
              Télécharger le PDF
            </button>
          </div>

          {/* The printable document */}
          <div
            id="devis-doc"
            className="mx-auto w-full max-w-[800px] rounded-sm bg-white p-8 text-[#1b1b1b] shadow-sm ring-1 ring-zinc-200 sm:p-10"
            style={{ fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 pb-5" style={{ borderColor: '#F47B20' }}>
              <div>
                {showLogo ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="" style={{ height: 54, width: 'auto' }} />
                    {seller.name && <div className="text-[24px] font-extrabold leading-none tracking-tight text-zinc-900">{seller.name}</div>}
                  </div>
                ) : (
                  seller.name && <div className="text-[26px] font-extrabold leading-none tracking-tight text-zinc-900">{seller.name}</div>
                )}
                {seller.tagline && <div className="mt-1 text-xs text-zinc-500">{seller.tagline}</div>}
                {(seller.org || seller.phone || seller.email || seller.site) && (
                  <div className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                    {seller.org && <>{seller.org}<br /></>}
                    {(seller.phone || seller.email) && <>{[seller.phone, seller.email].filter(Boolean).join(' · ')}<br /></>}
                    {seller.site}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-black uppercase tracking-tight text-zinc-900">Devis</div>
                <table className="mt-2.5 ml-auto text-[11px]">
                  <tbody>
                    {devisNo && <tr><td className="pr-3 text-right text-zinc-400">N°</td><td className="text-left font-semibold text-zinc-800">{devisNo}</td></tr>}
                    {fmtDate(dateStr) && <tr><td className="pr-3 text-right text-zinc-400">Date</td><td className="text-left font-semibold text-zinc-800">{fmtDate(dateStr)}</td></tr>}
                    {validityDays > 0 && <tr><td className="pr-3 text-right text-zinc-400">Validité</td><td className="text-left font-semibold text-zinc-800">{validityDays} jour{validityDays > 1 ? 's' : ''}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recipient — only what's filled in (no empty placeholders) */}
            {(clientName || clientContact || clientAddress) && (
              <div className="mt-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Destinataire</div>
                {clientName && <div className="mt-1 text-sm font-bold text-zinc-900">{clientName}</div>}
                {clientContact && <div className="text-xs text-zinc-600">{clientContact}</div>}
                {clientAddress && <div className="text-xs text-zinc-600">{clientAddress}</div>}
              </div>
            )}

            {/* Line items — large, easy to read */}
            <table className="mt-7 w-full border-collapse text-[15px]">
              <thead>
                <tr className="border-b-2 border-zinc-300 text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="py-3 text-left font-semibold">Désignation</th>
                  <th className="py-3 text-center font-semibold">Qté</th>
                  <th className="py-3 text-right font-semibold">P.U.</th>
                  <th className="py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-zinc-100 align-top">
                    <td className="py-4 pr-3">
                      <div className="text-[15px] font-semibold text-zinc-900">{l.desc}</div>
                      {l.sub && <div className="mt-0.5 text-[12.5px] text-zinc-400">{l.sub}</div>}
                    </td>
                    <td className="py-4 text-center text-[15px] text-zinc-700">{l.qty}</td>
                    <td className="py-4 text-right text-[15px] text-zinc-700">{l.free ? '—' : money(l.unit)}</td>
                    <td className="py-4 text-right text-[15px] font-bold text-zinc-900">
                      {l.free ? <span className="rounded-md bg-green-50 px-2.5 py-1 text-[12.5px] font-bold text-green-700">Offert</span> : money(l.qty * l.unit)}
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-zinc-400">Choisissez un forfait ou des supports.</td></tr>
                )}
              </tbody>
            </table>

            {/* Extra-stand pricing — explains the cost of more supports */}
            {extraStandCost > 0 && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-600">
                <span className="font-semibold text-zinc-800">Supports supplémentaires :</span> {money(extraStandCost)} TND / unité au-delà des supports offerts.
              </p>
            )}

            {/* Inclus dans l'offre — highlighted for the client, never billed */}
            {included.length > 0 && (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700">Inclus dans cette offre</div>
                <div className="mt-2.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {included.map((it, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] text-zinc-700">
                      <svg viewBox="0 0 24 24" className="mt-[3px] h-3.5 w-3.5 shrink-0" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <table className="min-w-[240px] text-sm">
                <tbody>
                  <tr><td className="py-1 pr-8 text-zinc-500">Sous-total</td><td className="py-1 text-right font-semibold text-zinc-800">{money(subtotal)} TND</td></tr>
                  {discount > 0 && <tr><td className="py-1 pr-8 text-zinc-500">Remise</td><td className="py-1 text-right font-semibold text-zinc-700">− {money(discount)} TND</td></tr>}
                  {tvaPct > 0 && <tr><td className="py-1 pr-8 text-zinc-500">TVA ({tvaPct}%)</td><td className="py-1 text-right font-semibold text-zinc-800">{money(tva)} TND</td></tr>}
                  <tr className="border-t-2 border-zinc-900">
                    <td className="py-2 pr-8 text-base font-bold text-zinc-900">Total</td>
                    <td className="py-2 text-right text-base font-black" style={{ color: '#F47B20' }}>{money(total)} TND</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Facilité de paiement — pay the lifetime in 2 monthly instalments */}
            {install2x && (
              <div className="mt-3 flex justify-end">
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 px-4 py-2.5 text-[12px] leading-relaxed text-zinc-700">
                  <span className="font-semibold text-orange-700">Facilité de paiement</span> — réglable en 2 mensualités de <span className="font-semibold text-zinc-900">{money(PLANS.lifetime.price / 2)} TND/mois</span> (soit {money(PLANS.lifetime.price)} TND).
                </div>
              </div>
            )}

            {/* Payment + conditions */}
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Modes de paiement</div>
                <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-zinc-600">
                  {PAYMENT_METHODS.flatMap((m) => m.details.split('\n')).map((line, i) => {
                    const [k, ...rest] = line.split(' : ')
                    return (
                      <div key={i}>
                        <span className="font-semibold text-zinc-800">{k} :</span> {rest.join(' : ')}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Conditions</div>
                <div className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-600">
                  {notes.trim() || [validityDays > 0 ? `Devis valable ${validityDays} jour${validityDays > 1 ? 's' : ''}.` : '', 'Prix en dinars tunisiens (TND).', "Activation de l'abonnement et préparation des supports après réception du paiement."].filter(Boolean).join(' ')}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 border-t border-zinc-200 pt-3 text-center text-[10px] text-zinc-400">
              {[seller.name, seller.org, seller.site].filter(Boolean).join(' · ')}{(seller.name || seller.org || seller.site) ? ' · ' : ''}Merci de votre confiance.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
