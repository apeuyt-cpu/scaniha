#!/usr/bin/env node
/**
 * Probe (READ-ONLY): for a sample of stored images, compare the raw origin
 * object vs the Supabase render endpoint (resize+webp). Tells us:
 *   - real origin file sizes (is the migration output actually small?)
 *   - whether image transformations are ENABLED on this project/plan
 *     (render returns the transformed bytes vs an error / the full file)
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const STORAGE = '/storage/v1/object/public/'

function renderUrl(u, width, quality = 62) {
  const i = u.indexOf(STORAGE)
  if (i === -1) return null
  return `${u.slice(0, i)}/storage/v1/render/image/public/${u.slice(i + STORAGE.length)}?width=${width}&quality=${quality}&resize=contain`
}

async function size(u) {
  try {
    const r = await fetch(u)
    if (!r.ok) return { status: r.status, bytes: null, type: r.headers.get('content-type') }
    const b = Buffer.from(await r.arrayBuffer())
    return { status: r.status, bytes: b.length, type: r.headers.get('content-type') }
  } catch (e) { return { status: 'ERR', bytes: null, type: String(e.message) } }
}

// Grab a handful of stored item/category/logo URLs.
const { data: items } = await db.from('items').select('image_url').not('image_url', 'is', null).limit(200)
const urls = (items || []).map((r) => r.image_url).filter((u) => u && u.includes(STORAGE)).slice(0, 6)

console.log('\n=== IMAGE PROBE ===\n')
let originTotal = 0, renderTotal = 0, n = 0
for (const u of urls) {
  const raw = await size(u)
  const rnd = await size(renderUrl(u, 200))
  const path = u.split(STORAGE)[1]
  console.log(`• ${path}`)
  console.log(`    origin : ${raw.status}  ${raw.bytes != null ? (raw.bytes / 1024).toFixed(1) + ' KB' : '—'}  ${raw.type}`)
  console.log(`    render@200: ${rnd.status}  ${rnd.bytes != null ? (rnd.bytes / 1024).toFixed(1) + ' KB' : '—'}  ${rnd.type}`)
  if (raw.bytes && rnd.bytes) { originTotal += raw.bytes; renderTotal += rnd.bytes; n++ }
}
if (n) {
  console.log(`\nAvg origin: ${(originTotal / n / 1024).toFixed(1)} KB   Avg render@200: ${(renderTotal / n / 1024).toFixed(1)} KB`)
  console.log(renderTotal < originTotal ? '✅ render endpoint IS transforming (smaller)' : '⚠️ render NOT smaller — transforms may be disabled')
}
console.log('')
process.exit(0)
