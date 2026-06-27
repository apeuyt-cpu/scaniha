/**
 * One-time migration: re-encode every stored AVIF image to WebP and repoint the
 * DB at it. We serve image origins directly now (the Supabase render endpoint is
 * a paid feature, disabled on the free plan), so the stored format must be
 * universally decodable — AVIF isn't on older browsers, WebP is everywhere.
 *
 * Per image (safe ordering — DB only ever points at a file that exists):
 *   download AVIF → encode WebP → upload WebP → update DB → delete old AVIF.
 * A failure on one image logs and skips it (DB still points at the working AVIF).
 *
 * Run:  node scripts/migrate-avif-to-webp.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET = 'menu-images'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

// ── env ──
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing Supabase env'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// Old AVIF files are kept by default: cached menu pages may still reference them
// for up to the cache TTL (~30 min), and deleting now would 404 those. Re-run
// with DELETE_OLD=1 later (after caches have rolled over) to reclaim the storage.
const DELETE_OLD = process.env.DELETE_OLD === '1'

const isAvif = (u) => typeof u === 'string' && u.toLowerCase().endsWith('.avif') && u.includes(PUBLIC_MARKER)
const pathOf = (u) => { const i = u.indexOf(PUBLIC_MARKER); return i === -1 ? null : decodeURIComponent(u.slice(i + PUBLIC_MARKER.length)) }

let migrated = 0, failed = 0
const urlCache = new Map() // oldUrl -> newUrl (so a URL reused across rows migrates once)

/** Convert one AVIF public URL to a WebP public URL (idempotent-ish). Returns new URL or null. */
async function convert(oldUrl) {
  if (urlCache.has(oldUrl)) return urlCache.get(oldUrl)
  const oldPath = pathOf(oldUrl)
  if (!oldPath) return null
  const newPath = oldPath.replace(/\.avif$/i, '.webp')
  try {
    const res = await fetch(oldUrl)
    if (!res.ok) throw new Error(`download ${res.status}`)
    const avif = Buffer.from(await res.arrayBuffer())
    const webp = await sharp(avif).webp({ quality: 80, effort: 6 }).toBuffer()
    const up = await supabase.storage.from(BUCKET).upload(newPath, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: true })
    if (up.error) throw up.error
    const newUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl
    urlCache.set(oldUrl, newUrl)
    return newUrl
  } catch (e) {
    console.error(`  ✗ convert ${oldPath}: ${e.message || e}`)
    failed++
    return null
  }
}

async function deleteOld(oldUrl) {
  if (!DELETE_OLD) return
  const p = pathOf(oldUrl)
  if (!p) return
  const { error } = await supabase.storage.from(BUCKET).remove([p])
  if (error) console.warn(`  ! could not delete ${p}: ${error.message}`)
}

/** Migrate a simple table column (items/categories/businesses). */
async function migrateColumn(table, col) {
  const { data, error } = await supabase.from(table).select(`id, ${col}`).ilike(col, '%.avif')
  if (error) { console.error(`${table}.${col} fetch:`, error.message); return }
  console.log(`\n${table}.${col}: ${data.length} AVIF`)
  for (const row of data) {
    const oldUrl = row[col]
    if (!isAvif(oldUrl)) continue
    const newUrl = await convert(oldUrl)
    if (!newUrl) continue
    const { error: upErr } = await supabase.from(table).update({ [col]: newUrl }).eq('id', row.id)
    if (upErr) { console.error(`  ✗ update ${table} ${row.id}: ${upErr.message}`); failed++; continue }
    await deleteOld(oldUrl)
    migrated++
    process.stdout.write('.')
  }
}

/** Migrate AVIF URLs embedded in businesses.design_settings (jsonb). */
async function migrateDesignSettings() {
  const { data, error } = await supabase.from('businesses').select('id, design_settings')
  if (error) { console.error('businesses.design_settings fetch:', error.message); return }
  const targets = data.filter((b) => JSON.stringify(b.design_settings || {}).includes('.avif'))
  console.log(`\nbusinesses.design_settings: ${targets.length} with AVIF`)
  for (const b of targets) {
    let json = JSON.stringify(b.design_settings)
    const urls = [...new Set(json.match(/https?:\/\/[^"\\ ]+?\.avif/gi) || [])].filter(isAvif)
    let changed = false
    for (const oldUrl of urls) {
      const newUrl = await convert(oldUrl)
      if (!newUrl) continue
      json = json.split(oldUrl).join(newUrl)
      changed = true
    }
    if (!changed) continue
    const { error: upErr } = await supabase.from('businesses').update({ design_settings: JSON.parse(json) }).eq('id', b.id)
    if (upErr) { console.error(`  ✗ update business ${b.id}: ${upErr.message}`); failed++; continue }
    for (const oldUrl of urls) if (urlCache.has(oldUrl)) await deleteOld(oldUrl)
    migrated++
    process.stdout.write('.')
  }
}

console.log('AVIF → WebP migration starting…')
await migrateColumn('categories', 'image_url')
await migrateColumn('items', 'image_url')
await migrateColumn('businesses', 'logo_url')
await migrateDesignSettings()
console.log(`\n\nDone. migrated rows: ${migrated}, failures: ${failed}, unique files converted: ${urlCache.size}`)
process.exit(failed > 0 ? 1 : 0)
