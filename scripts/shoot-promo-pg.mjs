import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const PORT = process.env.PORT || 3003
const OUT = 'C:/Users/Med Saief Allah/Desktop/scaniha-product-promo-ar'
mkdirSync(OUT, { recursive: true })

const ids = [
  ...Array.from({ length: 10 }, (_, i) => `pt${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `gm${i + 1}`),
]

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1600 },
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
      try { await document.fonts.load('900 90px Cairo') } catch {}
      try { await document.fonts.load('700 40px Cairo') } catch {}
    })
    await page.waitForTimeout(350)
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
