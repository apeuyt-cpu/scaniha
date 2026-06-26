// Seed a realistic 30-day sales history for a demo café so the owner KPI
// dashboard (chiffre d'affaires par jour, panier moyen, plats les plus vendus)
// looks full in sales demos. Pulls the café's REAL menu, generates orders with
// believable volume/items/statuses, and a promo banner.
//
// Usage:  node scripts/seed-demo-sales.mjs [slug]      (default: asdsad)
// Idempotent: wipes the café's existing orders first, so re-runs are clean.
// Reads SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL from .env.local.

import fs from 'node:fs'
import crypto from 'node:crypto'

const SLUG = process.argv[2] || 'asdsad'
const DAYS = 30

const env = fs.readFileSync('.env.local', 'utf8')
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}
const tok = get('SUPABASE_ACCESS_TOKEN')
const ref = get('NEXT_PUBLIC_SUPABASE_URL').replace(/^https?:\/\//, '').split('.')[0]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const q = async (sql) => {
  let lastErr
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      })
      const t = await r.text()
      if (!r.ok) throw new Error(`SQL ${r.status}: ${t.slice(0, 300)}`)
      return t ? JSON.parse(t) : []
    } catch (e) {
      lastErr = e
      if (attempt < 8) await sleep(4000) // ride out transient network blips
    }
  }
  throw lastErr
}
const esc = (s) => String(s).replace(/'/g, "''")
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const NAMES = ['Salma', 'Karim', 'Yassine', 'Nour', 'Mehdi', 'Lina', 'Aziz', 'Rania', null, null, null]
// Skewed status mix: most orders complete; a few rejected (excluded from revenue).
const STATUS = [...Array(80).fill('delivered'), ...Array(8).fill('ready'), ...Array(6).fill('preparing'), ...Array(3).fill('new'), ...Array(3).fill('rejected')]

async function main() {
  const biz = (await q(`select id, name from public.businesses where slug='${esc(SLUG)}' limit 1;`))[0]
  if (!biz) throw new Error(`No café for slug '${SLUG}'`)
  const items = await q(`select i.id, i.name, i.price from public.items i join public.categories c on c.id = i.category_id where c.business_id = '${biz.id}' and i.available = true and i.price is not null and i.price > 0;`)
  if (!items.length) throw new Error('Café has no priced menu items to sell.')
  console.log(`Café "${biz.name}" (${SLUG}) — ${items.length} sellable items.`)

  // Fresh start.
  await q(`delete from public.orders where business_id = '${biz.id}';`)

  const orderRows = []
  const itemRows = []
  let total = 0, n = 0
  const now = Date.now()
  for (let d = DAYS - 1; d >= 0; d--) {
    // More orders on weekends; a believable lunch/dinner spread.
    const day = new Date(now - d * 86_400_000)
    const weekend = day.getDay() === 5 || day.getDay() === 6
    const count = weekend ? rand(6, 11) : rand(2, 7)
    for (let k = 0; k < count; k++) {
      const oid = crypto.randomUUID()
      const status = pick(STATUS)
      const lines = rand(1, 4)
      let oTotal = 0
      const chosen = new Set()
      for (let l = 0; l < lines; l++) {
        const it = pick(items)
        if (chosen.has(it.id)) continue
        chosen.add(it.id)
        const qty = rand(1, 3)
        const price = Number(it.price)
        oTotal += price * qty
        itemRows.push(`('${oid}','${it.id}','${esc(it.name)}',${price},${qty})`)
      }
      // Random time on that day (10:00–23:00).
      const ts = new Date(day)
      ts.setHours(rand(10, 23), rand(0, 59), rand(0, 59), 0)
      const nm = pick(NAMES)
      orderRows.push(`('${oid}','${biz.id}','${rand(1, 12)}','${status}',${nm ? `'${esc(nm)}'` : 'null'},${oTotal.toFixed(3)},'${ts.toISOString()}')`)
      n++
      if (status !== 'rejected') total += oTotal
    }
  }

  // Insert in chunks to stay under payload limits.
  for (let i = 0; i < orderRows.length; i += 200) {
    await q(`insert into public.orders (id, business_id, table_number, status, customer_name, total, created_at) values ${orderRows.slice(i, i + 200).join(',')};`)
  }
  for (let i = 0; i < itemRows.length; i += 400) {
    await q(`insert into public.order_items (order_id, item_id, name, price, qty) values ${itemRows.slice(i, i + 400).join(',')};`)
  }

  // A live promo banner for the demo.
  const promo = JSON.stringify({ enabled: true, message: 'Happy hour 17h–19h : -20% sur les boissons', emoji: '🎉', until: null })
  await q(`update public.businesses set design_settings = coalesce(design_settings,'{}'::jsonb) || jsonb_build_object('promo','${esc(promo)}'::jsonb) where id = '${biz.id}';`)

  console.log(`Seeded ${n} orders (${itemRows.length} line items) over ${DAYS} days. Revenue (non-rejected): ${total.toFixed(3)} TND. Promo banner set.`)
}

main().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1) })
