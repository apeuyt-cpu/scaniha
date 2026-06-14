#!/usr/bin/env node
/**
 * Safety test: can the Supabase render endpoint read an AVIF origin, and how
 * do WebP-only vs AVIF compare? Uploads two temp objects, probes render, cleans up.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'menu-images'
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: items } = await db.from('items').select('image_url').not('image_url', 'is', null).limit(50)
const sample = (items || []).map((r) => r.image_url).find((u) => u && u.includes('/object/public/'))
const path = decodeURIComponent(sample.split(`/object/public/${BUCKET}/`)[1])
const dl = await db.storage.from(BUCKET).download(path)
const input = Buffer.from(await dl.data.arrayBuffer())

const base = () => sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
const webp = await base().webp({ quality: 74, effort: 6, smartSubsample: true }).toBuffer()
const avif = await base().avif({ quality: 52, effort: 4 }).toBuffer()
console.log(`\nsample: ${path}`)
console.log(`origin (current webp): ${(input.length/1024).toFixed(1)} KB`)
console.log(`webp e6 q74         : ${(webp.length/1024).toFixed(1)} KB  (${(((input.length-webp.length)/input.length)*100).toFixed(0)}% smaller)`)
console.log(`avif q52            : ${(avif.length/1024).toFixed(1)} KB  (${(((input.length-avif.length)/input.length)*100).toFixed(0)}% smaller)`)

// Upload AVIF + WebP to temp paths and probe the render endpoint on each.
const tmpA = `uploads/_tmp_${randomUUID()}.avif`
const tmpW = `uploads/_tmp_${randomUUID()}.webp`
await db.storage.from(BUCKET).upload(tmpA, avif, { contentType: 'image/avif', upsert: true })
await db.storage.from(BUCKET).upload(tmpW, webp, { contentType: 'image/webp', upsert: true })
const renderOf = (p) => `${URL}/storage/v1/render/image/public/${BUCKET}/${p}?width=200&quality=62&resize=contain`
async function probe(p) {
  const r = await fetch(renderOf(p))
  const b = r.ok ? Buffer.from(await r.arrayBuffer()) : null
  return `${r.status}  ${b ? (b.length/1024).toFixed(1)+' KB' : '—'}  ${r.headers.get('content-type')}`
}
console.log(`\nrender(AVIF origin)@200: ${await probe(tmpA)}`)
console.log(`render(WebP origin)@200: ${await probe(tmpW)}`)
await db.storage.from(BUCKET).remove([tmpA, tmpW])
console.log('\n(temp objects removed)\n')
process.exit(0)
