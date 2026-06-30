// Unified staff foundation smoke test: create → verify → lockout → reset.
// Run: node scripts/app-staff-smoke.mjs
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (...a) => console.log(...a)
let fails = 0
const check = (n, c, e) => { log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  ' + e : ''}`); if (!c) fails++ }
const LABEL = 'SmokeUnified'

const { data: biz } = await sb.from('businesses').select('id, name').eq('slug', 'asdsad').maybeSingle()
if (!biz) { console.error('asdsad not found'); process.exit(1) }

// backfill sanity (count is informational — asdsad may have had 0 old staff)
const { count: total } = await sb.from('app_staff').select('id', { count: 'exact', head: true })
log(`info: app_staff total rows = ${total}`)

// fresh slate
await sb.from('app_staff').delete().eq('business_id', biz.id).eq('label', LABEL)

const c = (await sb.rpc('staff_create', { p_business: biz.id, p_branch: null, p_label: LABEL, p_pin: '4321', p_role: 'manager' })).data
check('staff_create ok', c?.ok && c?.role === 'manager', JSON.stringify(c))
const id = c.id

// duplicate label rejected
const dup = (await sb.rpc('staff_create', { p_business: biz.id, p_branch: null, p_label: LABEL, p_pin: '5555', p_role: 'cashier' })).data
check('duplicate label rejected', dup?.ok === false && dup?.error === 'duplicate_label', JSON.stringify(dup))

// good pin → identity
const v1 = (await sb.rpc('staff_verify_pin', { p_business: biz.id, p_staff: id, p_pin: '4321' })).data
check('verify good pin → identity+role', v1?.ok && v1?.staffId === id && v1?.role === 'manager', JSON.stringify(v1))

// 5 bad pins → lockout
let last
for (let i = 0; i < 5; i++) last = (await sb.rpc('staff_verify_pin', { p_business: biz.id, p_staff: id, p_pin: '0000' })).data
const { data: row } = await sb.from('app_staff').select('failed_attempts, locked_until').eq('id', id).single()
check('5 bad pins set lockout', row?.locked_until && new Date(row.locked_until) > new Date(), `failed=${row?.failed_attempts} locked_until=${row?.locked_until}`)

// even the GOOD pin is rejected while locked
const vLocked = (await sb.rpc('staff_verify_pin', { p_business: biz.id, p_staff: id, p_pin: '4321' })).data
check('good pin rejected while locked', vLocked?.ok === false && vLocked?.error === 'locked', JSON.stringify(vLocked))

// reset → good pin works again
await sb.rpc('staff_reset_lockout', { p_business: biz.id, p_staff: id })
const v2 = (await sb.rpc('staff_verify_pin', { p_business: biz.id, p_staff: id, p_pin: '4321' })).data
check('reset → good pin ok again', v2?.ok === true, JSON.stringify(v2))

// audit immutability: insert one row, prove UPDATE is blocked
await sb.rpc('log_staff_action', { p_business: biz.id, p_branch: null, p_actor: id, p_actor_label: LABEL, p_action: 'smoke_test', p_target_table: null, p_target_id: null, p_amount: null, p_detail: 'smoke' })
const { data: arow } = await sb.from('staff_audit').select('id').eq('business_id', biz.id).eq('action', 'smoke_test').order('created_at', { ascending: false }).limit(1).maybeSingle()
check('audit row written', !!arow?.id, JSON.stringify(arow))
const upd = await sb.from('staff_audit').update({ detail: 'hacked' }).eq('id', arow?.id || 0)
check('audit UPDATE blocked (immutable)', !!upd.error, upd.error?.message || 'no error?!')

// cleanup the test staff (audit row left — it is append-only by design)
await sb.from('app_staff').delete().eq('id', id)

log(fails === 0 ? '\nUNIFIED STAFF FOUNDATION: ALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
