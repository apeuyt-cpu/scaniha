import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getBusinessByOwner, businessCacheTag } from '@/lib/db/business'

/**
 * Busts the public menu cache for the authenticated owner's business so menu /
 * design edits show up immediately instead of waiting out the cache TTL.
 *
 * Owner-only on purpose: an open endpoint would let anyone force cache busts
 * and hammer the database — exactly what the caching is meant to avoid. The
 * slug is derived from the session, never trusted from the request body, so an
 * owner can only ever revalidate their OWN menu.
 */
export async function POST() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let business
  try {
    business = await getBusinessByOwner(user.id)
  } catch {
    business = null
  }
  if (!business) {
    return NextResponse.json({ ok: false, error: 'no business' }, { status: 403 })
  }

  // Next 16: the 2nd arg ('max') reproduces the legacy full-invalidation and
  // satisfies the new revalidateTag signature.
  revalidateTag(businessCacheTag(business.slug), 'max')
  return NextResponse.json({ ok: true, slug: business.slug })
}
