#!/usr/bin/env node
/**
 * Generate the two QR codes for a café (by slug): the Menu QR and the Fidélité
 * QR. Mirrors the owner Share page exactly — when the café's scan-to-play gate
 * is on, both URLs carry `?s=<qrKey>` so scanning unlocks the roulette.
 *
 *   node scripts/make-machewi-qr.mjs [slug]
 *
 * Outputs raw QR PNGs + print-ready captioned cards to the Desktop.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const SLUG = process.argv[2] || 'machewi-mahmoud-becha'
const BASE = 'https://scaniha.com'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1) }
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function qrBuffer(text) {
  // High-res, high error-correction (Q) so a logo/crop still scans.
  return QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: 'Q', margin: 1, width: 620, color: { dark: '#18181b', light: '#FFFFFF' } })
}

// Compose a print-ready card: title badge + café name + QR + caption + brand.
async function card({ outPath, badge, badgeColor, title, cafe, caption, url }) {
  const W = 900, H = 1180
  const qr = await qrBuffer(url)
  const qrSize = 600, qrX = (W - qrSize) / 2, qrY = 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" rx="40" fill="#FFFFFF"/>
    <rect x="0" y="0" width="${W}" height="14" rx="7" fill="${badgeColor}"/>
    <rect x="${(W - 300) / 2}" y="70" width="300" height="56" rx="28" fill="${badgeColor}"/>
    <text x="${W / 2}" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="28" fill="#FFFFFF" letter-spacing="2">${esc(badge)}</text>
    <text x="${W / 2}" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="52" fill="#1C1917">${esc(title)}</text>
    <text x="${W / 2}" y="262" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="30" fill="#6B7280">${esc(cafe)}</text>
    <rect x="${qrX - 26}" y="${qrY - 26}" width="${qrSize + 52}" height="${qrSize + 52}" rx="36" fill="#FFFFFF" stroke="#E7E1D8" stroke-width="2"/>
    <text x="${W / 2}" y="${qrY + qrSize + 96}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="#1C1917">${esc(caption)}</text>
    <text x="${W / 2}" y="${qrY + qrSize + 140}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="500" font-size="22" fill="#9A938B">Sans application — un simple scan</text>
    <text x="${W / 2}" y="${H - 46}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="34" fill="${badgeColor}">Scaniha</text>
  </svg>`
  await sharp(Buffer.from(svg))
    .composite([{ input: qr, left: Math.round(qrX), top: qrY }])
    .png()
    .toFile(outPath)
}

async function main() {
  const { data: biz, error } = await db.from('businesses').select('id, name, slug').eq('slug', SLUG).maybeSingle()
  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!biz) { console.error(`No business with slug "${SLUG}".`); process.exit(1) }

  // Scan-to-play gate (games.config.qrGate) of the roulette game.
  const { data: games } = await db.from('games').select('config').eq('business_id', biz.id).eq('type', 'roulette').order('created_at', { ascending: true }).limit(1)
  const gate = games?.[0]?.config?.qrGate || null
  const gated = Boolean(gate?.enabled)
  const qrKey = (gated && typeof gate?.qrKey === 'string') ? gate.qrKey : ''
  const suffix = gated && qrKey ? `?s=${qrKey}` : ''

  const menuUrl = `${BASE}/${biz.slug}${suffix}`
  const fidUrl = `${BASE}/${biz.slug}/fidelite${suffix}`

  const outDir = path.join(os.homedir(), 'Desktop', `Scaniha - QR ${biz.slug}`)
  await fs.mkdir(outDir, { recursive: true })

  // Raw QR PNGs.
  await fs.writeFile(path.join(outDir, 'qr-menu.png'), await qrBuffer(menuUrl))
  await fs.writeFile(path.join(outDir, 'qr-fidelite.png'), await qrBuffer(fidUrl))

  // Print-ready cards.
  await card({ outPath: path.join(outDir, 'carte-menu.png'), badge: 'MENU', badgeColor: '#F47B20', title: 'Notre menu', cafe: biz.name, caption: 'Scannez pour voir le menu', url: menuUrl })
  await card({ outPath: path.join(outDir, 'carte-fidelite.png'), badge: 'FIDÉLITÉ', badgeColor: '#D97706', title: 'Carte de fidélité', cafe: biz.name, caption: 'Scannez, jouez & gagnez', url: fidUrl })

  console.log('Business :', biz.name, `(${biz.slug})`)
  console.log('Gate     :', gated ? `ON — key embedded (?s=${qrKey.slice(0, 6)}…)` : 'OFF — plain URLs')
  console.log('Menu URL :', menuUrl)
  console.log('Fid URL  :', fidUrl)
  console.log('Saved to :', outDir)
}
main()
