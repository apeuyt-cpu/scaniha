import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { seedDemoMenu } from '@/lib/demo-menu-seed'
import { getBusinessRequest, updateBusinessRequest } from '@/lib/db/business-requests'

// Super-admin: CREATE a café + its owner account. This is the v2 onboarding
// entry point (replacing owner self-signup). Mirrors the owner-create columns
// from app/api/admin/business/route.ts EXACTLY (theme_id design12,
// design_settings.loyaltyEnabled=false, slug rules, collision checks) but ALSO
// provisions the auth user via the service-role admin API and returns a temp
// password ONCE (there is no email infra — credentials are relayed manually).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESERVED_SLUGS = new Set(['super-admin', 'admin', 'login', 'signup'])

/** Human-typable temp password (no ambiguous 0/O/1/l/I) — shared over WhatsApp. */
function genTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(12)
  let out = ''
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

export async function POST(request: Request) {
  try {
    const { user: actor } = await requireSuperAdmin()

    const body = await request.json().catch(() => ({}))
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
    const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim().toLowerCase() : ''
    const ownerPhone = typeof body.ownerPhone === 'string' ? body.ownerPhone.trim() : ''
    const requestId = typeof body.requestId === 'string' ? body.requestId : null
    const trialDays = Number.isFinite(body.trialDays) ? Math.max(1, Math.min(3650, Math.floor(body.trialDays))) : 7

    if (!businessName) {
      return NextResponse.json({ error: "Le nom de l'établissement est requis." }, { status: 400 })
    }
    if (!ownerEmail || !EMAIL_RE.test(ownerEmail)) {
      return NextResponse.json({ error: "Une adresse e-mail propriétaire valide est requise." }, { status: 400 })
    }

    const slug = generateSlug(businessName)
    if (!slug || RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: 'Ce nom est réservé ou invalide. Veuillez en choisir un autre.' },
        { status: 400 },
      )
    }

    const svc: any = await createServiceRoleClient()

    // ── Collision checks (mirror the owner-create route) ──────────────────────
    const { data: nameClash } = await svc.from('businesses').select('id').eq('name', businessName).maybeSingle()
    if (nameClash) {
      return NextResponse.json({ error: "Ce nom d'établissement est déjà utilisé." }, { status: 400 })
    }
    const { data: slugClash } = await svc.from('businesses').select('id').eq('slug', slug).maybeSingle()
    if (slugClash) {
      return NextResponse.json({ error: "Ce nom génère un lien déjà utilisé. Choisissez-en un autre." }, { status: 400 })
    }

    // ── Resolve / create the owner auth user ─────────────────────────────────
    let ownerUserId: string | null = null
    let tempPassword: string | null = genTempPassword()
    let isNewUser = true

    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { phone_number: ownerPhone || undefined, created_by: 'super_admin' },
    })

    if (createErr) {
      const msg = String(createErr.message || '').toLowerCase()
      const exists = msg.includes('already') || msg.includes('registered') || msg.includes('exists') || createErr.status === 422
      if (!exists) {
        console.error('[super-admin/businesses] createUser error:', createErr.message)
        return NextResponse.json({ error: "Échec de la création du compte propriétaire." }, { status: 500 })
      }
      // Email already has an account — find it and decide whether we can reuse it.
      isNewUser = false
      tempPassword = null
      // Page through all users (listUsers caps at perPage; a single page would
      // miss an email beyond the first 1000 and wrongly 409 a legit re-create).
      let found: any = null
      for (let page = 1; page <= 50 && !found; page++) {
        const { data: list } = await svc.auth.admin.listUsers({ page, perPage: 1000 })
        const users = list?.users || []
        found = users.find((u: any) => (u.email || '').toLowerCase() === ownerEmail) || null
        if (users.length < 1000) break // last page
      }
      if (!found) {
        return NextResponse.json(
          { error: "Cette adresse e-mail existe déjà mais le compte est introuvable." },
          { status: 409 },
        )
      }
      ownerUserId = found.id
      // Never silently attach a café to a stranger who already runs one.
      const { data: ownsAlready } = await svc.from('businesses').select('id').eq('owner_id', ownerUserId).maybeSingle()
      if (ownsAlready) {
        return NextResponse.json(
          { error: "Ce propriétaire possède déjà un établissement. Création annulée." },
          { status: 409 },
        )
      }
    } else {
      ownerUserId = created.user.id
    }

    // ── Ensure the profile exists with role 'owner' (service role bypasses the
    //    profiles_guard; the auth.users trigger usually creates it already). ──
    try {
      await svc.from('profiles').upsert({ user_id: ownerUserId, role: 'owner' }, { onConflict: 'user_id' })
    } catch (e: any) {
      console.warn('[super-admin/businesses] profile upsert warning:', e?.message)
    }

    // Seed the product grant (formule) from the request/body so the new café opens
    // scoped to what they asked for. Super-admin can change it later in
    // BusinessManager → Produits. 'ordering' is provisioned separately.
    let reqProduct: string | null = typeof body.product === 'string' ? body.product : null
    if (!reqProduct && requestId) {
      try { reqProduct = (await getBusinessRequest(requestId))?.product || null } catch {}
    }
    const designSettings: any = { loyaltyEnabled: false }
    if (reqProduct === 'fidelite') { designSettings.products = 'fidelity'; designSettings.loyaltyEnabled = true }
    else if (reqProduct === 'both') { designSettings.products = 'both'; designSettings.loyaltyEnabled = true }
    else if (reqProduct === 'menu' || reqProduct === 'ordering') { designSettings.products = 'menu' }
    // 'autre' / unknown → legacy default (menu + owner-controlled fidelity).

    // ── Insert the business (service role → not capped by businesses_guard) ───
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + trialDays)

    const { data: business, error: businessError } = await svc
      .from('businesses')
      .insert({
        owner_id: ownerUserId,
        name: businessName,
        slug,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        theme_id: 'design12',
        design_settings: designSettings,
      })
      .select()
      .single()

    if (businessError) {
      // Roll back a freshly-created auth user so a failed insert leaves no orphan.
      if (isNewUser && ownerUserId) {
        try { await svc.auth.admin.deleteUser(ownerUserId) } catch {}
      }
      if (businessError.code === '23505') {
        return NextResponse.json({ error: "Ce nom d'établissement est déjà utilisé." }, { status: 400 })
      }
      console.error('[super-admin/businesses] insert error:', businessError.message)
      return NextResponse.json({ error: "Échec de la création de l'établissement." }, { status: 500 })
    }

    // Pre-fill a starter demo menu (best-effort, idempotent).
    if (business?.id) {
      try { await seedDemoMenu(svc, business.id) } catch (e: any) { console.warn('[super-admin/businesses] seed warning:', e?.message) }
    }

    // Link + close the originating request, if this came from the queue.
    if (requestId) {
      try {
        await updateBusinessRequest(requestId, { status: 'converted', business_id: business.id, handled_by: actor.id })
      } catch (e: any) { console.warn('[super-admin/businesses] request link warning:', e?.message) }
    }

    console.warn(
      `[AUDIT] super-admin ${actor.id} (${actor.email ?? 'n/a'}) created business ${business.id} ` +
        `("${businessName}", ${slug}) for owner ${ownerUserId} (newUser=${isNewUser}) at ${new Date().toISOString()}`,
    )

    // no-store: the body carries a one-time temp password — never cache it.
    return NextResponse.json(
      {
        success: true,
        business,
        owner: { userId: ownerUserId, email: ownerEmail },
        tempPassword,
        isNewUser,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('[super-admin/businesses] POST error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
