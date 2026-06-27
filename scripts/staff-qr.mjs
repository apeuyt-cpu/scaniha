import QRCode from 'qrcode'
import { mkdirSync } from 'node:fs'

mkdirSync('public/poster-assets', { recursive: true })
// The staff QR is universal — /admin/caisse is the same URL for every café; the
// login decides which business. So one real, scannable QR works on the design.
await QRCode.toFile('public/poster-assets/staff-qr.png', 'https://scaniha.com/admin/caisse', {
  width: 720, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' },
})
console.log('✓ public/poster-assets/staff-qr.png → https://scaniha.com/admin/caisse')
