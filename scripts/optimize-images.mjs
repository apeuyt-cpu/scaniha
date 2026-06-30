#!/usr/bin/env node
/**
 * Re-optimize every stored menu image to "max" settings (AVIF/WebP smallest wins).
 *
 *   node scripts/optimize-images.mjs               # DRY RUN — measures savings, writes nothing
 *   node scripts/optimize-images.mjs --apply       # re-encode + re-upload + repoint DB rows
 *   node scripts/optimize-images.mjs --apply --min-gain=15   # only replace if >=15% smaller
 *   node scripts/optimize-images.mjs --apply --keep-old      # don't delete the old objects
 *
 * Scope: businesses.logo_url, categories.image_url, items.image_url already in
 * the Supabase Storage bucket. Work is DEDUPED by URL, so an image shared by
 * several rows (e.g. seed data) is encoded once and EVERY referencing row is
 * repointed before the old object is removed — no row is ever left dangling.
 * Logos/receipts stay WebP (favicon/raw-serve safety); menu photos prefer AVIF.
 * Idempotent + resumable: a row already on the optimized object is skipped.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const APPLY = process.argv.includes('--apply')
const KEEP_OLD = process.argv.includes('--keep-old')
const MIN_GAIN = Number(process.argv.find((a) => a.startsWith('--min-gain='))?.split('=')[1] || 8)
const BUCKET = 'menu-images'
const STORAGE = `/storage/v1/object/public/${BUCKET}/`
const MAX_DIMENSION = 1600
const WEBP_ONLY = new Set(['logos', 'receipts'])

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1) }
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const pathFromUrl = (u) => {
  const i = typeof u === 'string' ? u.indexOf(STORAGE) : -1
  return i === -1 ? null : decodeURIComponent(u.slice(i + STORAGE.length))
}
const folderOf = (p) => p.split('/').slice(0, -1).join('/') || 'uploads'
const KB = (b) => (b / 1024).toFixed(1) + ' KB'

/** Maxed encoder — mirrors lib/storage-server.ts encodeOptimized(). */
async function encode(input, folder, animated) {
  const base = sharp(input, { animated, limitInputPixels: 64_000_000 })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
  if (animated) return { buf: await base.webp({ quality: 70, effort: 4 }).toBuffer(), ext: 'webp', type: 'image/webp' }
  const webp = await base.clone().webp({ quality: 76, effort: 6, smartSubsample: true }).toBuffer()
  if (!WEBP_ONLY.has(folder.split('/')[0])) {
    const avif = await base.clone().avif({ quality: 52, effort: 4 }).toBuffer().catch(() => null)
    if (avif && avif.length < webp.length) return { buf: avif, ext: 'avif', type: 'image/avif' }
  }
  return { buf: webp, ext: 'webp', type: 'image/webp' }
}

// Collect every storage-backed image reference, then group rows by URL.
async function collect() {
  const refs = []
  const grab = async (table, col) => {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(table).select(`id, ${col}`).range(from, from + 999)
      if (error) { console.error(`${table}: ${error.message}`); break }
      for (const r of data || []) if (pathFromUrl(r[col])) refs.push({ table, col, id: r.id, url: r[col] })
      if (!data || data.length < 1000) break
    }
  }
  await grab('businesses', 'logo_url')
  await grab('categories', 'image_url')
  await grab('items', 'image_url')
  const byUrl = new Map()
  for (const r of refs) (byUrl.get(r.url) || byUrl.set(r.url, []).get(r.url)).push(r)
  return byUrl
}

async function main() {
  const byUrl = await collect()
  const refCount = [...byUrl.values()].reduce((s, a) => s + a.length, 0)
  console.log(`\n${APPLY ? '⚙️  APPLY' : '🔍 DRY RUN'} — ${byUrl.size} unique images (${refCount} rows), min gain ${MIN_GAIN}%\n`)

  let origTotal = 0, newTotal = 0, shrunk = 0, kept = 0, errs = 0, done = 0
  for (const [url, rows] of byUrl) {
    const path = pathFromUrl(url)
    try {
      const dl = await db.storage.from(BUCKET).download(path)
      if (dl.error) throw dl.error
      const input = Buffer.from(await dl.data.arrayBuffer())
      const { buf, ext, type } = await encode(input, folderOf(path), /\.gif$/i.test(path))
      origTotal += input.length
      const gain = ((input.length - buf.length) / input.length) * 100
      if (gain >= MIN_GAIN) {
        shrunk++; newTotal += buf.length
        if (APPLY) {
          const newPath = `${folderOf(path)}/${randomUUID()}.${ext}`
          const up = await db.storage.from(BUCKET).upload(newPath, buf, { contentType: type, cacheControl: '31536000', upsert: false })
          if (up.error) throw up.error
          const { data: pub } = db.storage.from(BUCKET).getPublicUrl(newPath)
          for (const r of rows) {
            const upd = await db.from(r.table).update({ [r.col]: pub.publicUrl }).eq('id', r.id)
            if (upd.error) throw upd.error
          }
          if (!KEEP_OLD) await db.storage.from(BUCKET).remove([path]) // safe: all rows repointed above
        }
      } else { kept++; newTotal += input.length }
      done++
      if (done % 20 === 0) console.log(`  …${done}/${byUrl.size}`)
    } catch (e) { errs++; console.error(`  ✗ ${path}: ${e.message}`) }
  }

  const saved = origTotal - newTotal
  console.log('\n── Summary ──')
  console.log(`  unique processed : ${done}   shrunk : ${shrunk}   kept (already small) : ${kept}   errors : ${errs}`)
  console.log(`  origin total : ${KB(origTotal)}   ->  new total : ${KB(newTotal)}`)
  console.log(`  saved : ${KB(saved)}  (${origTotal ? ((saved / origTotal) * 100).toFixed(1) : 0}%)`)
  console.log(APPLY ? '\n✅ Applied & DB repointed.\n' : '\n(dry run — nothing written; re-run with --apply to commit)\n')
  process.exit(errs > 0 && APPLY ? 1 : 0)
}
main()
