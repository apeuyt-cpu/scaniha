/**
 * Capture mobile screenshots of the fidelity flow for the landing showcase.
 * Saves phone-sized PNGs to public/landing/fidelity/.
 *
 *   node scripts/shoot-fidelity.mjs <slug> [baseUrl]
 */
import { createRequire } from 'module'
import { mkdirSync } from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const sharp = require('sharp')

const SLUG = process.argv[2]
const BASE = process.argv[3] || 'http://localhost:3003'
// Optional diner session token → captures the LOGGED-IN boutique (real points
// balance) instead of the 3 logged-out screens.
const TOKEN = process.argv[4] || null
if (!SLUG) { console.error('usage: node scripts/shoot-fidelity.mjs <slug> [baseUrl] [dinerToken]'); process.exit(1) }

const OUT = path.join(process.cwd(), 'public', 'landing', 'fidelity')
mkdirSync(OUT, { recursive: true })

// Keep the headless tab "foreground" so the data fetch isn't throttled
// (the cause of skeleton-state screenshots / ERR_NETWORK_IO_SUSPENDED).
const ARGS = ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']

async function launch() {
  for (const channel of ['msedge', 'chrome', 'chrome-beta', 'msedge-beta']) {
    try { const b = await chromium.launch({ channel, headless: true, args: ARGS }); console.log('launched: ' + channel); return b } catch (e) { console.log(`channel ${channel}: ${e.message.split('\n')[0]}`) }
  }
  const b = await chromium.launch({ headless: true, args: ARGS }); console.log('launched: bundled'); return b
}

const browser = await launch()
// Shorter viewport so the fixed bottom-nav sits just under the content — no big
// empty band in the middle (which made the phone frames look cut/empty).
const ctx = await browser.newContext({ viewport: { width: 390, height: 730 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
// When a diner token is supplied, log that session into localStorage on every
// page so the hub renders the authenticated view (real points balance).
if (TOKEN) {
  await ctx.addInitScript(({ slug, token }) => { try { localStorage.setItem('scaniha_diner_' + slug, token) } catch (e) {} }, { slug: SLUG, token: TOKEN })
}

const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR: ' + m.text().slice(0, 100)) })

const hideDevTools = `nextjs-portal,#__next-build-watcher,[data-nextjs-toast]{display:none!important}`

// `marker` is text that only appears once the real content (not the skeleton) is in.
// loggedIn shots also wait for the "Connectez-vous" prompt to disappear.
const shots = TOKEN
  ? [{ t: 'boutique', name: 'rewards', marker: 'Récompenses', loggedIn: true }]
  : [
      { t: 'carte', name: 'card', marker: 'Votre carte de fidélité' },
      { t: 'roue', name: 'wheel', marker: 'Tourner la roue' },
      { t: 'boutique', name: 'rewards', marker: 'Récompenses' },
    ]

for (const s of shots) {
  const url = `${BASE}/${SLUG}/fidelite?t=${s.t}`
  let ready = false
  for (let attempt = 0; attempt < 3 && !ready; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForFunction((m) => !!document.body && document.body.innerText.includes(m), s.marker, { timeout: 20000 })
      if (s.loggedIn) await page.waitForFunction(() => !document.body.innerText.includes('Connectez-vous'), null, { timeout: 15000 })
      ready = true
    } catch (e) {
      console.log(`retry ${attempt} (${s.t}): ${e.message.split('\n')[0]}`)
      await page.waitForTimeout(1500)
    }
  }
  if (!ready) { console.log('NOT READY ' + url); continue }
  await page.addStyleTag({ content: hideDevTools })
  try { await page.evaluate(() => document.fonts && document.fonts.ready) } catch {}
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r }))))
  await page.waitForTimeout(1100)
  const buf = await page.screenshot({ type: 'png' })
  await sharp(buf).webp({ quality: 82 }).toFile(path.join(OUT, `${s.name}.webp`))
  console.log('saved ' + s.name + '.webp')
}

await browser.close()
console.log('OUT: ' + OUT)
