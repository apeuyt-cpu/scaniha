import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const PORT = process.env.PORT || 3003
const OUT = 'C:/Users/Med Saief Allah/Desktop/scaniha-admin-sticker'
mkdirSync(OUT, { recursive: true })

const ids = ['stk-staff-cream', 'stk-staff-dark', 'stk-staff-orange']

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1280 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

let ok = 0
for (const id of ids) {
  try {
    await page.goto(`http://localhost:${PORT}/${id}`, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForSelector('#poster', { timeout: 20000 })
    await page.evaluate(async () => {
      await document.fonts.ready
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
