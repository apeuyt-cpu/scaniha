// POS ↔ fidélité smoke test: POS sale auto-credits loyalty points (integrated
// side), idempotent on replay, optional (no phone = no points). The manual side
// (award_points via /admin/caisse) is the same RPC and already verified.
// Run: node scripts/pos-loyalty-smoke.mjs
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (...a) => console.log(...a)
let fails = 0
const check = (n, c, e) => { log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  ' + e : ''}`); if (!c) fails++ }
const PHONE = '99000111' // clearly-fake test phone

const { data: biz } = await sb.from('businesses').select('id, name').eq('slug', 'asdsad').maybeSingle()
if (!biz) { console.error('asdsad not found'); process.exit(1) }

// Ensure a loyalty program exists (demo café). Don't clobber an existing rate.
let { data: prog } = await sb.from('loyalty_programs').select('points_per_tnd, welcome_points, active').eq('business_id', biz.id).maybeSingle()
if (!prog) {
  await sb.from('loyalty_programs').insert({ business_id: biz.id, active: true, points_per_tnd: 1, welcome_points: 10 })
  prog = { points_per_tnd: 1, welcome_points: 10, active: true }
}
const ppt = Number(prog.points_per_tnd), welcome = Number(prog.welcome_points)

// fresh slate for the test phone
await sb.from('points_ledger').delete().eq('business_id', biz.id).eq('customer_phone', PHONE)

const branch = (await sb.rpc('pos_ensure_primary_branch', { p_business: biz.id, p_name: biz.name })).data
const { data: prods } = await sb.from('pos_products').select('id, name, price').eq('business_id', biz.id).order('sort')
const capp = prods.find((p) => p.name === 'Cappuccino') || prods[0]
const price = Number(capp.price)
const expectedPurchase = Math.round(price * ppt)

// ── Sale 1: pay WITH phone → points credited ──
const s1 = (await sb.rpc('pos_open_sale', { p_business: biz.id, p_branch: branch, p_table: null, p_table_label: 'LoyTest', p_opened_by: null, p_server: null })).data.saleId
await sb.rpc('pos_add_line', { p_business: biz.id, p_sale: s1, p_product: capp.id, p_qty: 1, p_modifiers: [] })
const idem1 = 'loy-' + Date.now()
const pay1 = (await sb.rpc('pos_pay', { p_business: biz.id, p_sale: s1, p_payments: [{ method: 'cash', amount: price, tendered: price + 5 }], p_idem: idem1, p_paid_by: null, p_phone: PHONE })).data
check('POS pay returns loyalty', pay1?.ok && pay1?.loyalty?.ok, JSON.stringify(pay1?.loyalty))
check('purchase points = round(total*rate)', pay1?.loyalty?.pointsAdded === expectedPurchase, `got ${pay1?.loyalty?.pointsAdded} expected ${expectedPurchase}`)
check('welcome bonus granted once (first toucher)', pay1?.loyalty?.welcomeAdded === welcome, `got ${pay1?.loyalty?.welcomeAdded}`)

let bal = (await sb.from('points_ledger').select('delta').eq('business_id', biz.id).eq('customer_phone', PHONE)).data.reduce((s, r) => s + Number(r.delta), 0)
check('ledger balance = welcome + purchase', bal === welcome + expectedPurchase, `balance ${bal}`)

// ── Replay the SAME payment → no double credit ──
const pay1b = (await sb.rpc('pos_pay', { p_business: biz.id, p_sale: s1, p_payments: [{ method: 'cash', amount: price, tendered: price + 5 }], p_idem: idem1, p_paid_by: null, p_phone: PHONE })).data
check('replay returns replay flag', pay1b?.ok && pay1b?.replay === true, JSON.stringify(pay1b))
bal = (await sb.from('points_ledger').select('delta').eq('business_id', biz.id).eq('customer_phone', PHONE)).data.reduce((s, r) => s + Number(r.delta), 0)
check('replay did NOT re-credit points', bal === welcome + expectedPurchase, `balance still ${bal}`)

// ── Sale 2: pay WITHOUT phone → no points ──
const s2 = (await sb.rpc('pos_open_sale', { p_business: biz.id, p_branch: branch, p_table: null, p_table_label: 'NoLoy', p_opened_by: null, p_server: null })).data.saleId
await sb.rpc('pos_add_line', { p_business: biz.id, p_sale: s2, p_product: capp.id, p_qty: 1, p_modifiers: [] })
const pay2 = (await sb.rpc('pos_pay', { p_business: biz.id, p_sale: s2, p_payments: [{ method: 'cash', amount: price, tendered: price }], p_idem: 'loy2-' + Date.now(), p_paid_by: null, p_phone: null })).data
check('no-phone sale paid', pay2?.ok === true)
check('no-phone sale credits nothing', pay2?.loyalty == null, JSON.stringify(pay2?.loyalty))

// ── cleanup ──
await sb.from('pos_sales').delete().in('id', [s1, s2])
await sb.from('points_ledger').delete().eq('business_id', biz.id).eq('customer_phone', PHONE)

log(fails === 0 ? '\nPOS ↔ FIDÉLITÉ: ALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
