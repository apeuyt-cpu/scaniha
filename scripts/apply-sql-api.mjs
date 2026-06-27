/**
 * Apply SQL files to the live DB via the Supabase MANAGEMENT API (not the pooler).
 * Uses SUPABASE_ACCESS_TOKEN (sbp_…) from .env.local. Project ref is read from
 * NEXT_PUBLIC_SUPABASE_URL. Each file is sent as one query; idempotent files only.
 *   node scripts/apply-sql-api.mjs supabase/a.sql supabase/b.sql ...
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const token = env.SUPABASE_ACCESS_TOKEN
const url = env.NEXT_PUBLIC_SUPABASE_URL || ''
const ref = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1]
if (!token) { console.error('SUPABASE_ACCESS_TOKEN missing from .env.local'); process.exit(1) }
if (!ref) { console.error('could not derive project ref from NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node scripts/apply-sql-api.mjs <file.sql> ...'); process.exit(1) }

let failed = 0
for (const f of files) {
  const query = readFileSync(f, 'utf8')
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (res.ok) {
    console.log('OK   ' + f)
  } else {
    failed++
    console.error('ERR  ' + f + '  →  ' + text)
  }
}
console.log(failed ? `done with ${failed} failure(s)` : 'done — all applied')
process.exit(failed ? 1 : 0)
