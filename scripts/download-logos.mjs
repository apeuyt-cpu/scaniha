import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

config({ path: '.env.local' })

const OUT_DIR = path.resolve('user-logos')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// --- gather data ---
const { data: profiles } = await supabase.from('profiles').select('user_id, email, phone_number, role')
const profileById = new Map((profiles || []).map(p => [p.user_id, p]))

const { data: businesses, error } = await supabase
  .from('businesses')
  .select('id, name, slug, owner_id, logo_url, status, created_at')
  .order('created_at', { ascending: true })

if (error) { console.error('Query failed:', error.message); process.exit(1) }

// --- prepare folder ---
await mkdir(OUT_DIR, { recursive: true })

const slugify = (s) =>
  (s || 'unnamed')
    .toString()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'unnamed'

const manifest = []
let downloaded = 0, skipped = 0, failed = 0

for (const b of businesses) {
  const owner = profileById.get(b.owner_id)
  const ownerEmail = owner?.email || '(unknown)'
  const base = slugify(b.slug || b.name)

  if (!b.logo_url || !b.logo_url.trim()) {
    skipped++
    manifest.push({ business: b.name, slug: b.slug, owner_email: ownerEmail, status: b.status, logo_file: null, logo_url: null, note: 'no logo' })
    console.log(`⏭️  ${b.name} — no logo`)
    continue
  }

  try {
    const res = await fetch(b.logo_url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ext = (path.extname(new URL(b.logo_url).pathname) || '.png').split('?')[0]
    const fileName = `${base}${ext}`
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(path.join(OUT_DIR, fileName), buf)
    downloaded++
    manifest.push({ business: b.name, slug: b.slug, owner_email: ownerEmail, status: b.status, logo_file: fileName, logo_url: b.logo_url, bytes: buf.length })
    console.log(`✅ ${b.name} → ${fileName} (${(buf.length / 1024).toFixed(1)} KB)`)
  } catch (e) {
    failed++
    manifest.push({ business: b.name, slug: b.slug, owner_email: ownerEmail, status: b.status, logo_file: null, logo_url: b.logo_url, error: e.message })
    console.log(`❌ ${b.name} — ${e.message}`)
  }
}

// manifest mapping users <-> logos
await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

console.log(`\n── Done ──`)
console.log(`Businesses: ${businesses.length} | Downloaded: ${downloaded} | No logo: ${skipped} | Failed: ${failed}`)
console.log(`Folder: ${OUT_DIR}`)
