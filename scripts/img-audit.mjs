#!/usr/bin/env node
/**
 * Image audit (READ-ONLY) — inventories every image URL stored in the DB and
 * classifies it: already-optimized (Supabase Storage), legacy (Cloudinary),
 * or other/external. Prints counts + rough byte estimates. Mutates nothing.
 *
 *   node scripts/img-audit.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const STORAGE = '/storage/v1/object/public/'
function classify(u) {
  if (!u || typeof u !== 'string' || !u.trim()) return 'empty'
  if (u.includes(STORAGE)) return 'storage'          // already in our bucket
  if (u.includes('res.cloudinary.com')) return 'cloudinary'
  if (/^https?:\/\//.test(u)) return 'external'
  return 'other'
}

// Pull every row of a table in pages (service role bypasses RLS).
async function pull(table, cols) {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(cols).range(from, from + PAGE - 1)
    if (error) { console.error(`  ${table}: ${error.message}`); break }
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

function tally(rows, col) {
  const t = { storage: 0, cloudinary: 0, external: 0, other: 0, empty: 0 }
  for (const r of rows) t[classify(r[col])]++
  return t
}
const fmt = (t) => `storage=${t.storage}  cloudinary=${t.cloudinary}  external=${t.external}  other=${t.other}  (empty=${t.empty})`

console.log('\n=== IMAGE AUDIT (read-only) ===\n')

const businesses = await pull('businesses', 'id, slug, logo_url')
console.log(`businesses.logo_url  [${businesses.length} rows]`)
console.log('  ' + fmt(tally(businesses, 'logo_url')))

const categories = await pull('categories', 'id, image_url')
console.log(`categories.image_url [${categories.length} rows]`)
console.log('  ' + fmt(tally(categories, 'image_url')))

const items = await pull('items', 'id, image_url')
console.log(`items.image_url      [${items.length} rows]`)
console.log('  ' + fmt(tally(items, 'image_url')))

// Gallery sync table (Cloudinary mirror) — may or may not exist.
const images = await pull('images', 'public_id, image_url, bytes')
if (images.length) {
  const t = tally(images, 'image_url')
  const totalBytes = images.reduce((s, r) => s + (Number(r.bytes) || 0), 0)
  console.log(`images (gallery)     [${images.length} rows]  ~${(totalBytes / 1048576).toFixed(1)} MB tracked`)
  console.log('  ' + fmt(t))
}

const all = [
  ...businesses.map((r) => r.logo_url),
  ...categories.map((r) => r.image_url),
  ...items.map((r) => r.image_url),
].filter(Boolean)
const grand = { storage: 0, cloudinary: 0, external: 0, other: 0, empty: 0 }
for (const u of all) grand[classify(u)]++
console.log('\n=== TOTAL live menu images (logo+cat+item) ===')
console.log('  ' + fmt(grand))
const toMigrate = grand.cloudinary + grand.external
console.log(`\n  -> ${grand.storage} already optimized in Storage`)
console.log(`  -> ${toMigrate} legacy (Cloudinary/external) NOT optimized & served full-size\n`)
process.exit(0)
