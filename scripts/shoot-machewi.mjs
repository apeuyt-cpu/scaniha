import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const PORT = process.env.PORT || 3003
const OUT = 'C:/Users/Med Saief Allah/Desktop/scaniha-machewi-fidelite'
mkdirSync(OUT, { recursive: true })

const ids = ['mc-caisse', 'mc-tent', 'mc-wall', 'mc-roue-caisse', 'mc-roue-tent', 'mc-roue-wall']

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
})
const page = await ctx.newPage()

let ok = 0
for (const id of ids) {
  try {
    await page.goto(`http://localhost:${PORT}/${id}`, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForSelector('#poster', { timeout: 20000 })
    await page.evaluate(async () => {
      await document.fonts.ready
      try { await document.fonts.load('800 90px Cairo') } catch {}
      try { await document.fonts.load('700 40px Cairo') } catch {}
      // ensure the logo image is decoded
      await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})))
    })
    await page.waitForTimeout(400)
    const el = await page.$('#poster')
    await el.screenshot({ path: `${OUT}/${id}.png` })
    ok++
    console.log(`✓ ${id}`)
  } catch (e) {
    console.log(`✗ ${id}: ${e.message}`)
  }
}

await browser.close()
console.log(`SAVED ${ok}/${ids.length} → ${OUT}`)
