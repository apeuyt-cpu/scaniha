import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { PAYMENT_PLANS } from '@/lib/payment-config'

/** Friendly plan name — all lifetime variants collapse to "À vie". */
function planDisplayLabel(plan: string): string {
  if (typeof plan === 'string' && plan.startsWith('lifetime')) return 'À vie'
  return PAYMENT_PLANS[plan]?.label || plan
}

/**
 * Current plan for a business: the most recent APPROVED manual payment request
 * (payment_requests is service-role only). No approved payment yet but still
 * active with an expiry → it's the 7-day free trial.
 */
async function currentPlan(business: any): Promise<string | null> {
  try {
    const svc: any = await createServiceRoleClient()
    const { data } = await svc
      .from('payment_requests')
      .select('plan, created_at')
      .eq('business_id', business.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
    const pr = data?.[0]
    if (pr?.plan) return planDisplayLabel(pr.plan)
    if (business.status === 'active' && business.expires_at) return 'Essai gratuit'
    return null
  } catch (e: any) {
    console.error('[admin/business] plan lookup:', e?.message)
    return null
  }
}

export async function GET() {
  try {
    // requireOwner already ensures user is owner and redirects super_admin
    const { user } = await requireOwner()
    
    // Get business owned by this user only
    const business = await getBusinessByOwner(user.id)

    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    // Verify the business actually belongs to this user (extra security check)
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé : cet établissement ne vous appartient pas.' },
        { status: 403 }
      )
    }

    // Don't auto-pause here - owners should always access their dashboard
    // Return business as-is (even if expired) + the current plan label.
    const plan = await currentPlan(business)
    return NextResponse.json({ ...business, plan })
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('[admin/business] GET error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireOwner()
    const supabase = await createServerClient()
    const body = await request.json()

    const { data: business } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    const allowedFields = ['name', 'primary_color']
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour.' }, { status: 400 })
    }

    const { error } = await (supabase.from('businesses') as any)
      .update(updates)
      .eq('id', business.id)

    if (error) {
      console.error('[admin/business] PATCH update error:', error.message)
      return NextResponse.json(
        { error: "Échec de la mise à jour de l'établissement." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, updates })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('[admin/business] PATCH error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // requireOwner already ensures user is owner and redirects super_admin
    const { user } = await requireOwner()
    
    const { businessName } = await request.json()

    if (!businessName || !businessName.trim()) {
      return NextResponse.json(
        { error: "Le nom de l'établissement est requis." },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const slug = generateSlug(businessName.trim())

    // Prevent using reserved slugs
    if (slug === 'super-admin' || slug === 'admin' || slug === 'login' || slug === 'signup') {
      return NextResponse.json(
        { error: 'Ce nom est réservé et ne peut pas être utilisé. Veuillez en choisir un autre.' },
        { status: 400 }
      )
    }

    // Check if business name already exists
    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      return NextResponse.json(
        { error: "Ce nom d'établissement est déjà utilisé. Veuillez en choisir un autre." },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json(
        { error: "Ce nom d'établissement génère un lien déjà utilisé. Veuillez en choisir un autre." },
        { status: 400 }
      )
    }

    // Create business with 7-day free trial
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 7) // 7 days from now

    const { data: business, error: businessError } = await (supabase
      .from('businesses') as any)
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        slug: slug,
        expires_at: expirationDate.toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (businessError) {
      if (businessError.code === '23505') {
        return NextResponse.json(
          { error: "Ce nom d'établissement est déjà utilisé. Veuillez en choisir un autre." },
          { status: 400 }
        )
      }
      console.error('[admin/business] POST insert error:', businessError.message)
      return NextResponse.json(
        { error: "Échec de la création de l'établissement." },
        { status: 500 }
      )
    }

    return NextResponse.json(business)
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('[admin/business] POST error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
