import { NextResponse } from 'next/server'
import { createBusinessRequest } from '@/lib/db/business-requests'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { clientIp } from '@/lib/api/client-ip'

// Public café-onboarding intake. Anyone can submit; the row lands in the
// super-admin "Demandes" queue. No auth — abuse is bounded by an IP rate limit
// and strict field validation. The table is RLS service-role-only, so this route
// is the only write path.

const PRODUCTS = new Set(['menu', 'fidelite', 'both', 'ordering', 'autre'])

/** Trim + hard length cap (prevents storage abuse). Returns '' for non-strings. */
function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export async function POST(request: Request) {
  try {
    // Spam guard: 5/min, 30/day per IP (separate namespace from the public API).
    const ip = clientIp(request)
    const rl = checkRateLimit(`business-request-ip:${ip}`, { perMinute: 5, perDay: 30 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans un instant.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const body = await request.json().catch(() => ({}))

    const business_name = clean(body.business_name ?? body.businessName, 120)
    const contact_name = clean(body.contact_name ?? body.contactName ?? body.name, 120)
    const phone = clean(body.phone, 40)
    const email = clean(body.email, 160)
    const city = clean(body.city, 120)
    const message = clean(body.message, 1500)
    const planRaw = clean(body.plan, 60)
    // CTA attribution (hero/pricing/contact/…), falls back to a generic tag.
    const source = clean(body.source, 40) || 'website'
    let product = clean(body.product, 20).toLowerCase()
    if (!PRODUCTS.has(product)) product = 'menu'

    if (!business_name || !contact_name || !phone) {
      return NextResponse.json(
        { error: 'Le nom de l’établissement, votre nom et un téléphone sont requis.' },
        { status: 400 },
      )
    }
    // Phone must contain at least a few digits.
    if ((phone.match(/\d/g) || []).length < 6) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
    }

    await createBusinessRequest({
      business_name,
      contact_name,
      phone,
      email: email || null,
      city: city || null,
      product,
      plan: planRaw || null,
      message: message || null,
      source,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[business-request] POST error:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}
