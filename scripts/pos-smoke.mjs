// POS sales-engine smoke test (server-priced, atomic, idempotent).
// Run: node scripts/pos-smoke.mjs
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (...a) => console.log(...a)
let fails = 0
const check = (name, cond, extra) => { log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) fails++ }

const { data: biz } = await sb.from('businesses').select('id, name').eq('slug', 'asdsad').maybeSingle()
if (!biz) { console.error('asdsad not found'); process.exit(1) }

const { data: branch } = await sb.rpc('pos_ensure_primary_branch', { p_business: biz.id, p_name: biz.name })
check('primary branch resolved', !!branch)

const { data: prods } = await sb.from('pos_products').select('id, name, price').eq('business_id', biz.id).order('sort')
check('catalog seeded', (prods?.length || 0) >= 4, `(${prods?.length} products)`)
const capp = prods.find((p) => p.name === 'Cappuccino')
const sand = prods.find((p) => p.name === 'Sandwich thon')

const { data: open } = await sb.rpc('pos_open_sale', { p_business: biz.id, p_branch: branch, p_table: null, p_table_label: 'Test', p_opened_by: null, p_server: 'Smoke' })
check('sale opened', open?.ok, JSON.stringify(open))
const saleId = open.saleId

await sb.rpc('pos_add_line', { p_business: biz.id, p_sale: saleId, p_product: capp.id, p_qty: 1, p_modifiers: [] })
await sb.rpc('pos_add_line', { p_business: biz.id, p_sale: saleId, p_product: sand.id, p_qty: 2, p_modifiers: [] })

let { data: s1 } = await sb.from('pos_sales').select('subtotal, total, tax_total').eq('id', saleId).single()
const expected = Number(capp.price) * 1 + Number(sand.price) * 2
check('server-priced subtotal', Number(s1.subtotal) === expected, `got ${s1.subtotal} expected ${expected}`)

// server-pricing: bogus product is rejected
const { data: bad } = await sb.rpc('pos_add_line', { p_business: biz.id, p_sale: saleId, p_product: '00000000-0000-0000-0000-000000000000', p_qty: 1, p_modifiers: [] })
check('bogus product rejected', bad?.ok === false && bad?.error === 'bad_product', JSON.stringify(bad))

// 10% discount
await sb.rpc('pos_apply_discount', { p_business: biz.id, p_sale: saleId, p_kind: 'pct', p_value: 10 })
let { data: s2 } = await sb.from('pos_sales').select('total, discount_total').eq('id', saleId).single()
check('discount applied', Math.abs(Number(s2.total) - expected * 0.9) < 0.001, `total ${s2.total}`)

// pay cash, idempotent
const idem = 'smoke-' + Date.now()
const { data: pay1 } = await sb.rpc('pos_pay', { p_business: biz.id, p_sale: saleId, p_payments: [{ method: 'cash', amount: Number(s2.total), tendered: 20 }], p_idem: idem, p_paid_by: null })
check('paid', pay1?.ok, JSON.stringify(pay1))
check('change computed', Math.abs(Number(pay1.change) - (20 - Number(s2.total))) < 0.001, `change ${pay1?.change}`)

const { data: pay2 } = await sb.rpc('pos_pay', { p_business: biz.id, p_sale: saleId, p_payments: [{ method: 'cash', amount: Number(s2.total), tendered: 20 }], p_idem: idem, p_paid_by: null })
check('idempotent replay (no double pay)', pay2?.ok && pay2?.replay === true, JSON.stringify(pay2))

const { data: payCount } = await sb.from('pos_sale_payments').select('id', { count: 'exact', head: true }).eq('sale_id', saleId)
const { count } = await sb.from('pos_sale_payments').select('id', { count: 'exact', head: true }).eq('sale_id', saleId)
check('exactly one payment row', count === 1, `rows=${count}`)

let { data: s3 } = await sb.from('pos_sales').select('status, paid_at').eq('id', saleId).single()
check('sale marked paid', s3.status === 'paid' && !!s3.paid_at)

// cleanup the test sale
await sb.from('pos_sales').delete().eq('id', saleId)

log(fails === 0 ? '\nALL POS ENGINE CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
