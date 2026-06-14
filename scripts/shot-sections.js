/* Screenshot each landing-page section to landing-shots/ (desktop + a mobile pass). */
const { chromium } = require('playwright-core')
const fs = require('fs')

const OUT = 'landing-shots'

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch (e) {
      console.log(`channel ${channel} failed: ${e.message.split('\n')[0]}`)
    }
  }
  throw new Error('No system browser found (msedge/chrome)')
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await launch()

  // ── Desktop pass ──
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  // Force reveal animations to complete
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')))
  // Scroll through the page so lazy-loaded images (e.g. footer logo) actually load
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(800)

  const sections = await page.evaluate(() => {
    const out = []
    const header = document.querySelector('header')
    if (header) out.push({ name: '1-header', y: 0, h: header.getBoundingClientRect().height + 8 })
    const sects = [...document.querySelectorAll('section')]
    const names = ['2-hero', '3-features', '4-engagement', '5-stand-duo', '6-clients', '7-pricing', '8-final-cta']
    sects.forEach((s, i) => {
      const r = s.getBoundingClientRect()
      out.push({ name: names[i] || `section-${i + 1}`, y: r.top + window.scrollY, h: r.height })
    })
    const footer = document.querySelector('footer')
    if (footer) {
      const r = footer.getBoundingClientRect()
      out.push({ name: '9-footer', y: r.top + window.scrollY, h: r.height })
    }
    return out
  })

  for (const s of sections) {
    const clipH = Math.min(s.h, 1800)
    await page.screenshot({
      path: `${OUT}/${s.name}.png`,
      clip: { x: 0, y: Math.max(0, s.y), width: 1440, height: clipH },
      fullPage: true,
    })
    console.log(`saved ${s.name}.png (h=${Math.round(clipH)})`)
  }

  // ── Mobile pass (hero only + full page) ──
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mob.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 })
  await mob.waitForTimeout(1500)
  await mob.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')))
  await mob.screenshot({ path: `${OUT}/8-mobile-hero.png` })
  console.log('saved 8-mobile-hero.png')

  await browser.close()
  console.log('DONE')
})().catch((e) => {
  console.error('FATAL', e.message)
  process.exit(1)
})
