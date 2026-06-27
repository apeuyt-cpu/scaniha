import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'TTT/user-logos/machewi-mahmoud-becha.png'
const OUTDIR = 'public/poster-assets'
mkdirSync(OUTDIR, { recursive: true })

const out = `${OUTDIR}/machewi-logo.webp`
const meta = await sharp(SRC).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })
await sharp(meta.data)
  .resize({ width: 900, withoutEnlargement: true })
  .webp({ quality: 94, alphaQuality: 100 })
  .toFile(out)
const final = await sharp(out).metadata()
console.log(`✓ ${out} — ${final.width}x${final.height} (ratio ${(final.width / final.height).toFixed(2)})`)
