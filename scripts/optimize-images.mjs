#!/usr/bin/env node
/**
 * Re-optimize every stored image to "max" settings.
 *
 *   node scripts/optimize-images.mjs            # DRY RUN — measures savings, writes nothing
 *   node scripts/optimize-images.mjs --apply    # re-encode + re-upload + update DB
 *   node scripts/optimize-images.mjs --apply --min-gain 10   # only replace if >=10% smaller
 *
 * Scope: businesses.logo_url, categories.image_url, items.image_url that already
 * live in our Supabase Storage bucket. Each origin is downloaded, re-encoded with
 * the maxed encoder (WebP effort 6 + AVIF, smallest wins), and — only when it
 * actually shrinks by >= --min-gain % — re-uploaded and the DB row repointed.
 * Old object is removed after the row is updated. Idempotent + resumable.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const APPLY = process.argv.includes('--apply')
const MIN_GAIN = Number((process.argv.find((a) => a.startsWith('--min-gain='))?.split('=')[1]) || 8)
const BUCKET = 'menu-images'
const STORAGE = `/storage/v1/object/public/${BUCKET}/`
const MAX_DIMENSION = 1600

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing Supabase env'); process.exit(1) }
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const pathFromUrl = (u) => {
  const i = typeof u === 'string' ? u.indexOf(STORAGE) : -1
  return i === -1 ? null : decodeURIComponent(u.slice(i + STORAGE.length))
}
const folderOf = (p) => p.split('/').slice(0, -1).join('/') || 'uploads'

/** Maxed encoder: returns the smallest of WebP(effort6) / AVIF for the resized, rotated image. */
async function maxEncode(input, animated) {
  const base = sharp(input, { animated, limitInputPixels: 64_000_000 })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
  if (animated) {
    const webp = await base.webp({ quality: 70, effort: 6 }).toBuffer()
    return { buf: webp, ext: 'webp', type: 'image/webp' }
  }
  const [webp, avif] = await Promise.all([
    base.clone().webp({ quality: 74, effort: 6, smartSubsample: true }).toBuffer(),
    base.clone().avif({ quality: 52, effort: 4 }).toBuffer().catch(() => null),
  ])
  if (avif && avif.length < webp.length) return { buf: avif, ext: 'avif', type: 'image/avif' }
  return { buf: webp, ext: 'webp', type: 'image/webp' }
}

async function rows() {
  const out = []
  const grab = async (table, col) => {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(table).select(`id, ${col}`).range(from, from + 999)
      if (error) { console.error(`${table}: ${error.message}`); break }
      for (const r of data || []) if (pathFromUrl(r[col])) out.push({ table, col, id: r.id, url: r[col] })
      if (!data || data.length < 1000) break
    }
  }
  await grab('businesses', 'logo_url')
  await grab('categories', 'image_url')
  await grab('items', 'image_url')
  return out
}

const KB = (b) => (b / 1024).toFixed(1) + ' KB'
async function main() {
  const list = await rows()
  console.log(`\n${APPLY ? '⚙️  APPLY' : '🔍 DRY RUN'} — ${list.length} stored images, min gain ${MIN_GAIN}%\n`)
  let origTotal = 0, newTotal = 0, shrunk = 0, kept = 0, errs = 0, done = 0
  for (const r of list) {
    const path = pathFromUrl(r.url)
    try {
      const dl = await db.storage.from(BUCKET).download(path)
      if (dl.error) throw dl.error
      const input = Buffer.from(await dl.data.arrayBuffer())
      const animated = /\.gif$/i.test(path)
      const { buf, ext, type } = await maxEncode(input, animated)
      origTotal += input.length
      const gain = ((input.length - buf.length) / input.length) * 100
      if (gain >= MIN_GAIN) {
        shrunk++; newTotal += buf.length
        if (APPLY) {
          const newPath = `${folderOf(path)}/${randomUUID()}.${ext}`
          const up = await db.storage.from(BUCKET).upload(newPath, buf, { contentType: type, cacheControl: '31536000', upsert: false })
          if (up.error) throw up.error
          const { data: pub } = db.storage.from(BUCKET).getPublicUrl(newPath)
          const upd = await db.from(r.table).update({ [r.col]: pub.publicUrl }).eq('id', r.id)
          if (upd.error) throw upd.error
          await db.storage.from(BUCKET).remove([path]) // best-effort cleanup of old object
        }
      } else { kept++; newTotal += input.length }
      done++
      if (done % 20 === 0) console.log(`  …${done}/${list.length}`)
    } catch (e) { errs++; console.error(`  ✗ ${path}: ${e.message}`) }
  }
  console.log('\n── Summary ──')
  console.log(`  processed : ${done}   shrunk : ${shrunk}   kept : ${kept}   errors : ${errs}`)
  console.log(`  origin total : ${KB(origTotal)}   new total : ${KB(newTotal)}`)
  const saved = origTotal - newTotal
  console.log(`  saved : ${KB(saved)}  (${origTotal ? ((saved / origTotal) * 100).toFixed(1) : 0}%)`)
  console.log(APPLY ? '\n✅ Applied.\n' : '\n(dry run — nothing written; re-run with --apply to commit)\n')
  process.exit(errs > 0 && APPLY ? 1 : 0)
}
main()
