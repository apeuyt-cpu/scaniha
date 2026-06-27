/**
 * One-time: download the 6 demo-menu photos (Unsplash) and bundle them as small
 * webp under public/demo-menu/, so every new café's seeded demo menu references
 * SHARED local images — no Supabase storage, no per-café cost, no runtime
 * dependency on Unsplash. Run: node scripts/fetch-demo-menu-images.mjs
 */
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SRC = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=70',
  pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=70',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=70',
  dessert: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=70',
  drink: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=640&q=70',
  coffee: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=640&q=70',
}

const outDir = new URL('../public/demo-menu/', import.meta.url)
mkdirSync(outDir, { recursive: true })

for (const [name, url] of Object.entries(SRC)) {
  const res = await fetch(url)
  if (!res.ok) { console.error('FAIL', name, res.status); continue }
  const buf = Buffer.from(await res.arrayBuffer())
  const webp = await sharp(buf).resize(600, 450, { fit: 'cover' }).webp({ quality: 72 }).toBuffer()
  await writeFile(new URL(`${name}.webp`, outDir), webp)
  console.log('OK', `public/demo-menu/${name}.webp`, Math.round(webp.length / 1024) + 'KB')
}
console.log('done')
