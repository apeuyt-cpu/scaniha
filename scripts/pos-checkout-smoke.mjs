// POS atomic checkout smoke test (the fast one-shot path).
// Run: node scripts/pos-checkout-smoke.mjs
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (...a) => console.log(...a)
let fails = 0
const check = (n, c, e) => { log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  ' + e : ''}`); if (!c) fails++ }
const PHONE = '99000222'
const created = []

const { data: biz } = await sb.from('businesses').select('id, name').eq('slug', 'asdsad').maybeSingle()
if (!biz) { console.error('asdsad not found'); process.exit(1) }
let { data: prog } = await sb.from('loyalty_programs').select('points_per_tnd, welcome_points').eq('business_id', biz.id).maybeSingle()
if (!prog) { await sb.from('loyalty_programs').insert({ business_id: biz.id, active: true }); prog = { points_per_tnd: 1, welcome_points: 10 } }
const ppt = Number(prog.points_per_tnd)
await sb.from('points_ledger').delete().eq('business_id', biz.id).eq('customer_phone', PHONE)
const branch = (await sb.rpc('pos_ensure_primary_branch', { p_business: biz.id, p_name: biz.name })).data
const { data: prods } = await sb.from('pos_products').select('id, name, price').eq('business_id', biz.id)
const capp = prods.find((p) => p.name === 'Cappuccino'), sand = prods.find((p) => p.name === 'Sandwich thon')
const expectedTotal = Number(capp.price) * 2 + Number(sand.price) * 1

const co = async (lines, payments, idem, phone) =>
  (await sb.rpc('pos_checkout', { p_business: biz.id, p_branch: branch, p_lines: lines, p_discount_kind: null, p_discount_value: 0, p_payments: payments, p_idem: idem, p_paid_by: null, p_phone: phone })).data

// 1) full checkout with phone
const idem1 = 'co-' + Date.now()
const r1 = await co([{ productId: capp.id, qty: 2 }, { productId: sand.id, qty: 1 }], [{ method: 'cash', amount: expectedTotal, tendered: 20 }], idem1, PHONE)
check('checkout ok', r1?.ok === true, JSON.stringify(r1))
check('server-priced total', Number(r1?.total) === expectedTotal, `got ${r1?.total} expected ${expectedTotal}`)
check('change computed', Math.abs(Number(r1?.change) - (20 - expectedTotal)) < 0.001, `change ${r1?.change}`)
check('loyalty credited', r1?.loyalty?.ok && r1?.loyalty?.pointsAdded === Math.round(expectedTotal * ppt), JSON.stringify(r1?.loyalty))
if (r1?.saleId) created.push(r1.saleId)

// 2) replay → no second sale
const before = (await sb.from('pos_sales').select('id', { count: 'exact', head: true }).eq('business_id', biz.id)).count
const r2 = await co([{ productId: capp.id, qty: 2 }, { productId: sand.id, qty: 1 }], [{ method: 'cash', amount: expectedTotal, tendered: 20 }], idem1, PHONE)
const after = (await sb.from('pos_sales').select('id', { count: 'exact', head: true }).eq('business_id', biz.id)).count
check('replay flagged', r2?.replay === true, JSON.stringify(r2))
check('replay created NO new sale', before === after, `before ${before} after ${after}`)
const bal = (await sb.from('points_ledger').select('delta').eq('business_id', biz.id).eq('customer_phone', PHONE)).data.reduce((s, r) => s + Number(r.delta), 0)
check('replay did NOT double points', bal === Number(prog.welcome_points) + Math.round(expectedTotal * ppt), `balance ${bal}`)

// 3) insufficient payment → error, no sale
const cntA = (await sb.from('pos_sales').select('id', { count: 'exact', head: true }).eq('business_id', biz.id)).count
const r3 = await co([{ productId: capp.id, qty: 1 }], [{ method: 'cash', amount: 0.001, tendered: 0.001 }], 'co-ins-' + Date.now(), null)
const cntB = (await sb.from('pos_sales').select('id', { count: 'exact', head: true }).eq('business_id', biz.id)).count
check('insufficient rejected', r3?.ok === false && r3?.error === 'insufficient', JSON.stringify(r3))
check('insufficient left NO sale', cntA === cntB, `before ${cntA} after ${cntB}`)

// 4) bogus product → no_valid_items
const r4 = await co([{ productId: '00000000-0000-0000-0000-000000000000', qty: 1 }], [{ method: 'cash', amount: 99, tendered: 99 }], 'co-bog-' + Date.now(), null)
check('bogus product rejected', r4?.ok === false && r4?.error === 'no_valid_items', JSON.stringify(r4))

// cleanup
if (created.length) await sb.from('pos_sales').delete().in('id', created)
await sb.from('points_ledger').delete().eq('business_id', biz.id).eq('customer_phone', PHONE)
log(fails === 0 ? '\nPOS CHECKOUT: ALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
