import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-authoritative menu (catalog) writes. RLS alone can't read the staff
 * HMAC cookie, so a staff member without `catalog.manage` would still inherit
 * the owner's auth session and be allowed to write. Moving every DATABASE write
 * behind withStaff('catalog.manage', …) is the only enforcement point. When PINs
 * are off / owner / super-admin impersonating, getActiveStaff is owner-level →
 * no behaviour change.
 *
 * Image uploads stay client-side (anon Storage); only the row/column writes
 * (insert/update/delete + the image_url column after upload) go through here.
 * Reads stay on the anon client (RLS-safe).
 *
 *   { action: 'addCategory', name, position }
 *   { action: 'updateCategory', id, patch:{ name?, image_url? } }
 *   { action: 'deleteCategory', id }
 *   { action: 'toggleCategory', id, available }
 *   { action: 'moveCategory', id, position, swapId, swapPosition }
 *   { action: 'addItem', categoryId, name, description, price, position }
 *   { action: 'updateItem', id, patch:{ name?, description?, price?, image_url? } }
 *   { action: 'deleteItem', id }
 *   { action: 'toggleItem', id, available }
 *   { action: 'moveItem', id, position, swapId, swapPosition }
 *   { action: 'importExcel', categories:[{ name, items:[{ name, description, price }] }] }
 */

const NAME_MAX = 60
const DESC_MAX = 500
const MAX_CATEGORIES = 200
const MAX_ITEMS_PER_CATEGORY = 500

/** Trim a string, cap its length, return null when empty. */
function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, NAME_MAX) : null
}
function cleanDescription(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, DESC_MAX) : null
}
/** A price is a non-negative finite number, or null (no price). */
function cleanPrice(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!isFinite(n) || n < 0) return null
  return n
}
function cleanPosition(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

export const POST = withStaff('catalog.manage', async (request, { business }) => {
  try {
    const supabase: any = await createServiceRoleClient()
    const body = await request.json().catch(() => ({}))
    const action = body.action

    // ── Ownership guards: a row id is only touched if it belongs to this café ──
    const ownCategory = async (catId: string) => {
      if (!catId) return null
      const { data } = await supabase
        .from('categories')
        .select('id, business_id')
        .eq('id', catId)
        .maybeSingle()
      return data && data.business_id === business.id ? data : null
    }
    const ownItem = async (itemId: string) => {
      if (!itemId) return null
      const { data } = await supabase
        .from('items')
        .select('id, category_id')
        .eq('id', itemId)
        .maybeSingle()
      if (!data) return null
      return (await ownCategory(data.category_id)) ? data : null
    }

    /* ───────────────────────────── categories ───────────────────────────── */
    if (action === 'addCategory') {
      const name = cleanName(body.name)
      if (!name) return NextResponse.json({ error: 'Nom de catégorie requis.' }, { status: 400 })
      const { data: category, error } = await supabase
        .from('categories')
        .insert({ business_id: business.id, name, position: cleanPosition(body.position), available: true })
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, category })
    }

    if (action === 'updateCategory') {
      if (!(await ownCategory(String(body.id || '')))) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
      const patch = body.patch && typeof body.patch === 'object' ? body.patch : {}
      const update: Record<string, any> = {}
      if ('name' in patch) {
        const name = cleanName(patch.name)
        if (!name) return NextResponse.json({ error: 'Nom de catégorie requis.' }, { status: 400 })
        update.name = name
      }
      if ('image_url' in patch) {
        update.image_url = typeof patch.image_url === 'string' ? patch.image_url : null
      }
      if (Object.keys(update).length === 0) return NextResponse.json({ ok: true })
      const { error } = await supabase.from('categories').update(update).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'deleteCategory') {
      if (!(await ownCategory(String(body.id || '')))) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
      // Delete child items explicitly first (works whether or not the FK cascades).
      const { error: itemsErr } = await supabase.from('items').delete().eq('category_id', body.id)
      if (itemsErr) throw itemsErr
      const { error } = await supabase.from('categories').delete().eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'toggleCategory') {
      if (!(await ownCategory(String(body.id || '')))) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
      const { error } = await supabase.from('categories').update({ available: !!body.available }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'moveCategory') {
      const a = await ownCategory(String(body.id || ''))
      const b = await ownCategory(String(body.swapId || ''))
      if (!a || !b) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
      const [r1, r2] = await Promise.all([
        supabase.from('categories').update({ position: cleanPosition(body.position) }).eq('id', body.id),
        supabase.from('categories').update({ position: cleanPosition(body.swapPosition) }).eq('id', body.swapId),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
      return NextResponse.json({ ok: true })
    }

    /* ─────────────────────────────── items ──────────────────────────────── */
    if (action === 'addItem') {
      if (!(await ownCategory(String(body.categoryId || '')))) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
      const name = cleanName(body.name)
      if (!name) return NextResponse.json({ error: "Nom de l'article requis." }, { status: 400 })
      const { data: item, error } = await supabase
        .from('items')
        .insert({
          category_id: body.categoryId,
          name,
          description: cleanDescription(body.description),
          price: cleanPrice(body.price),
          available: true,
          position: cleanPosition(body.position),
        })
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, item })
    }

    if (action === 'updateItem') {
      if (!(await ownItem(String(body.id || '')))) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
      const patch = body.patch && typeof body.patch === 'object' ? body.patch : {}
      const update: Record<string, any> = {}
      if ('name' in patch) {
        const name = cleanName(patch.name)
        if (!name) return NextResponse.json({ error: "Nom de l'article requis." }, { status: 400 })
        update.name = name
      }
      if ('description' in patch) update.description = cleanDescription(patch.description)
      if ('price' in patch) update.price = cleanPrice(patch.price)
      if ('image_url' in patch) update.image_url = typeof patch.image_url === 'string' ? patch.image_url : null
      if (Object.keys(update).length === 0) return NextResponse.json({ ok: true })
      const { error } = await supabase.from('items').update(update).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'deleteItem') {
      if (!(await ownItem(String(body.id || '')))) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
      const { error } = await supabase.from('items').delete().eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'toggleItem') {
      if (!(await ownItem(String(body.id || '')))) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
      const { error } = await supabase.from('items').update({ available: !!body.available }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'moveItem') {
      const a = await ownItem(String(body.id || ''))
      const b = await ownItem(String(body.swapId || ''))
      if (!a || !b) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
      const [r1, r2] = await Promise.all([
        supabase.from('items').update({ position: cleanPosition(body.position) }).eq('id', body.id),
        supabase.from('items').update({ position: cleanPosition(body.swapPosition) }).eq('id', body.swapId),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
      return NextResponse.json({ ok: true })
    }

    /* ─────────────────────────── excel bulk import ──────────────────────── */
    if (action === 'importExcel') {
      const groups = Array.isArray(body.categories) ? body.categories.slice(0, MAX_CATEGORIES) : []
      if (groups.length === 0) return NextResponse.json({ error: 'Aucune donnée à importer.' }, { status: 400 })

      // Existing categories for this business (find-or-insert by name).
      const { data: existing } = await supabase
        .from('categories')
        .select('id, name, position')
        .eq('business_id', business.id)
      const existingList: any[] = existing || []
      const byName = new Map<string, any>()
      for (const c of existingList) byName.set(String(c.name), c)
      let nextPosition = existingList.length

      for (const group of groups) {
        const catName = cleanName(group?.name)
        if (!catName) continue

        let category = byName.get(catName)
        let categoryId: string | undefined = category?.id
        // Where new items start (after existing items in an existing category).
        let startPosition = 0

        if (!categoryId) {
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({ business_id: business.id, name: catName, position: nextPosition, available: true })
            .select('id, name, position')
            .single()
          if (catErr) throw catErr
          categoryId = newCat.id
          byName.set(catName, newCat)
          nextPosition++
        } else {
          // Continue positions after the category's current items.
          const { data: curItems } = await supabase
            .from('items')
            .select('position')
            .eq('category_id', categoryId)
          const positions = (curItems || []).map((i: any) => (typeof i.position === 'number' ? i.position : -1))
          startPosition = positions.length > 0 ? Math.max.apply(null, positions) + 1 : 0
          if (startPosition < 0) startPosition = 0
        }

        const rawItems = Array.isArray(group?.items) ? group.items.slice(0, MAX_ITEMS_PER_CATEGORY) : []
        const rows: any[] = []
        for (let i = 0; i < rawItems.length; i++) {
          const it = rawItems[i]
          const itemName = cleanName(it?.name)
          if (!itemName) continue
          rows.push({
            category_id: categoryId,
            name: itemName,
            description: cleanDescription(it?.description),
            price: cleanPrice(it?.price),
            available: true,
            position: startPosition + rows.length,
          })
        }
        if (rows.length > 0) {
          const { error: itemsErr } = await supabase.from('items').insert(rows)
          if (itemsErr) throw itemsErr
        }
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e
    console.error('admin/menu route:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
})
