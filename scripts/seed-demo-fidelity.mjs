/**
 * Throwaway demo café for capturing fidelity screenshots (landing showcase).
 * Creates an owner + business + active wheel (with prizes) + loyalty program
 * (+ rewards). Prints the slug. Delete afterwards with DELETE=<id> ... or via
 * the printed cleanup line. NOT for production data.
 *
 *   node scripts/seed-demo-fidelity.mjs          # create
 *   node scripts/seed-demo-fidelity.mjs <userId> # delete (cleanup)
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── cleanup mode ──
const cleanupUser = process.argv[2]
if (cleanupUser) {
  await supabase.from('businesses').delete().eq('owner_id', cleanupUser)
  const { error } = await supabase.auth.admin.deleteUser(cleanupUser)
  console.log('cleanup user', cleanupUser, error ? 'ERR ' + error.message : 'ok')
  process.exit(0)
}

const stamp = readFileSync(new URL('../package.json', import.meta.url), 'utf8').length // deterministic-ish suffix
const email = `demo_fidelity_${stamp}@example.com`
const slug = `demo-fidelite-${stamp}`

const { data: u, error: uErr } = await supabase.auth.admin.createUser({ email, password: 'demopass1234', email_confirm: true })
if (uErr) { console.error('user', uErr.message); process.exit(1) }
const uid = u.user.id

const { data: biz, error: bErr } = await supabase.from('businesses').insert({
  owner_id: uid, name: 'Café Lumière', slug, status: 'active',
  expires_at: '2030-01-01T00:00:00Z', theme_id: 'design11', primary_color: '#F47B20',
}).select().single()
if (bErr) { console.error('biz', bErr.message); process.exit(1) }

await supabase.from('loyalty_programs').insert({ business_id: biz.id, active: true, points_per_tnd: 1, welcome_points: 10 })
await supabase.from('loyalty_rewards').insert([
  { business_id: biz.id, label: 'Café offert', points_cost: 50, active: true, position: 0 },
  { business_id: biz.id, label: 'Pâtisserie offerte', points_cost: 100, active: true, position: 1 },
  { business_id: biz.id, label: '-20% sur l’addition', points_cost: 200, active: true, position: 2 },
])

const { data: game, error: gErr } = await supabase.from('games').insert({
  business_id: biz.id, type: 'roulette', active: true, daily_limit: 1, win_expiry_hours: 48, config: {},
}).select().single()
if (gErr) { console.error('game', gErr.message); process.exit(1) }

await supabase.from('prizes').insert([
  { game_id: game.id, label: 'Café offert', weight: 50, active: true, position: 0, cost: 2.5 },
  { game_id: game.id, label: '-10% addition', weight: 20, active: true, position: 1, cost: null },
  { game_id: game.id, label: 'Pâtisserie offerte', weight: 12, active: true, position: 2, cost: 4 },
  { game_id: game.id, label: 'Boisson offerte', weight: 10, active: true, position: 3, cost: 3 },
  { game_id: game.id, label: '-25% addition', weight: 5, active: true, position: 4, cost: null },
  { game_id: game.id, label: 'Dessert surprise', weight: 3, active: true, position: 5, cost: 5 },
])

console.log('SLUG=' + slug)
console.log('OWNER=' + uid)
console.log('cleanup: node scripts/seed-demo-fidelity.mjs ' + uid)
process.exit(0)
