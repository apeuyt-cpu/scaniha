import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const PORT = process.env.PORT || 3003
const OUT = 'C:/Users/Med Saief Allah/Desktop/scaniha-machewi-v2'
mkdirSync(OUT, { recursive: true })

const ids = process.env.IDS
  ? process.env.IDS.split(',')
  : [
      'mc2-stik-points', 'mc2-stik-roue', 'mc2-stik-mix',
      'mc2-a3-points', 'mc2-a3-roue', 'mc2-a3-mix',
      'mc2-stand-points', 'mc2-stand-roue', 'mc2-stand-mix',
    ]

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 2240 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
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
