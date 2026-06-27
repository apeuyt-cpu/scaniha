import sharp from 'sharp'

// Recolour the Machewi logo for LIGHT backgrounds:
// keep the orange/red flame, turn the white text + silver fish (and the gold
// subtitle) into a deep charcoal so it reads cleanly on cream — no box needed.
const SRC = 'TTT/user-logos/machewi-mahmoud-becha.png'
const OUT = 'public/poster-assets/machewi-logo-dark.webp'

const trimmed = await sharp(SRC).trim({ threshold: 12 }).toBuffer()
const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const INK = [28, 23, 17]
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
  if (a < 8) continue
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max === 0 ? 0 : (max - min) / max
  // flame = saturated, warm, red-dominant (low green/blue ratio). Keep it.
  const isFlame = sat > 0.42 && r > 120 && g < r * 0.62 && b < r * 0.62
  if (!isFlame) {
    data[i] = INK[0]; data[i + 1] = INK[1]; data[i + 2] = INK[2] // keep alpha (clean AA edges)
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize({ width: 900, withoutEnlargement: true })
  .webp({ quality: 94, alphaQuality: 100 })
  .toFile(OUT)

// preview on the real cream poster background so we can eyeball contrast
await sharp({ create: { width: 1000, height: 460, channels: 4, background: '#FFF4E4' } })
  .composite([{ input: OUT }])
  .png()
  .toFile('public/poster-assets/_machewi-dark-preview.png')

const m = await sharp(OUT).metadata()
console.log(`✓ ${OUT} — ${m.width}x${m.height}; preview → public/poster-assets/_machewi-dark-preview.png`)
