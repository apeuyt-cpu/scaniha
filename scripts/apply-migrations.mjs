/**
 * Apply SQL migration files to the live DB via the Supabase session pooler,
 * then reload the PostgREST schema cache. Idempotent files only.
 *   node scripts/apply-migrations.mjs supabase/a.sql supabase/b.sql ...
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'

const conn = readFileSync(new URL('../supabase/.temp/pooler-url', import.meta.url), 'utf8').trim()
const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node scripts/apply-migrations.mjs <file.sql> ...'); process.exit(1) }

// The pooler URL carries host/user/db but NOT the password — supply it from env.
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const password = env.SUPABASE_DB_PASSWORD
if (!password) { console.error('SUPABASE_DB_PASSWORD missing from .env.local'); process.exit(1) }

// Parse the URL into explicit fields — pg ignores an explicit `password` when a
// connectionString (without one) is also passed, so we don't use connectionString.
const u = new URL(conn)
const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port) || 5432,
  user: decodeURIComponent(u.username),
  database: u.pathname.replace(/^\//, '') || 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
})
await client.connect()
console.log('connected to pooler')
let failed = 0
for (const f of files) {
  const sql = readFileSync(f, 'utf8')
  try {
    await client.query(sql)
    console.log('OK   ' + f)
  } catch (e) {
    failed++
    console.error('ERR  ' + f + '  →  ' + (e.message || e))
  }
}
try { await client.query("notify pgrst, 'reload schema'"); console.log('PostgREST schema reload notified') } catch (e) { console.log('reload note: ' + (e.message || e)) }
await client.end()
console.log(failed ? `done with ${failed} failure(s)` : 'done — all applied')
process.exit(failed ? 1 : 0)
