/**
 * Public Loyalty API keys — lifecycle (mint / hash / list / revoke) + per-request
 * authentication. The SINGLE source of truth for key crypto and the auth boundary
 * of the /api/v1/* routes.
 *
 * Security model (see supabase/api_keys.sql + the v1 spec):
 *  - api_keys is service-role only (RLS + revokes); we use createServiceRoleClient().
 *  - The raw key is shown ONCE on create and NEVER stored — only sha256(raw) hex.
 *  - business_id is resolved from the AUTHENTICATED key, never from client input
 *    (the IDOR guard). `slug` and `id` come from the SAME businesses row, so the
 *    slug-keyed redeem_reward RPC can never be steered to another café.
 *
 * The typed Supabase client is cast to `any` for these calls — same convention as
 * lib/db/loyalty.ts — to keep the inserts/updates terse against the generated types.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** sha256 hex of a raw key. */
function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Mint a fresh key.
 *   raw    = 'sk_live_' + randomBytes(32).hex   (72 chars, 256 bits of entropy)
 *   prefix = first 16 chars of raw ('sk_live_' + 8 hex) — recognizable, NOT secret
 *   hash   = sha256(raw) hex — the only thing ever persisted
 */
export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = 'sk_live_' + randomBytes(32).toString('hex')
  const prefix = raw.slice(0, 16)
  const hash = sha256Hex(raw)
  return { raw, prefix, hash }
}

/** Public (non-secret) view of a key — never includes key_hash or the raw key. */
export interface ApiKeyPublic {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export type ApiScope = 'loyalty:read' | 'loyalty:write'

export interface AuthedKey {
  businessId: string
  slug: string
  scopes: string[]
  keyId: string
}

/**
 * Create a key for a business. Returns the raw key ONCE — it cannot be
 * recovered afterwards. Inserts (key_hash, key_prefix, business_id, name); the
 * default scopes/created_at come from the table defaults.
 */
export async function createApiKey(
  businessId: string,
  name: string
): Promise<{ id: string; raw: string; prefix: string; name: string; createdAt: string }> {
  const { raw, prefix, hash } = generateApiKey()
  const cleanName = String(name || 'Clé API').slice(0, 60) || 'Clé API'
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ business_id: businessId, name: cleanName, key_prefix: prefix, key_hash: hash })
    .select('id, name, created_at')
    .single()
  if (error || !data) {
    console.error('createApiKey:', error?.message)
    throw new Error('api_key_create_failed')
  }
  return { id: data.id, raw, prefix, name: data.name, createdAt: data.created_at }
}

/** List a business's keys (public fields only — never key_hash). */
export async function listApiKeys(businessId: string): Promise<ApiKeyPublic[]> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, revoked_at, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('listApiKeys:', error?.message)
    return []
  }
  return (data || []) as ApiKeyPublic[]
}

/**
 * Revoke a key. The `business_id` predicate is the IDOR guard for admin actions
 * — an owner can only revoke their OWN keys. Returns true when a still-active row
 * was revoked, false otherwise (not found / already revoked / wrong business).
 */
export async function revokeApiKey(businessId: string, id: string): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)
    .is('revoked_at', null)
    .select('id')
  if (error) {
    console.error('revokeApiKey:', error?.message)
    return false
  }
  return Array.isArray(data) && data.length > 0
}

/**
 * Authenticate an incoming request from its `Authorization: Bearer sk_live_...`
 * header. Resolves the business (id + slug, same row) from the key, rejecting
 * revoked keys and inactive/missing businesses BEFORE any loyalty RPC runs.
 *
 * Revocation/pausing are eventually consistent — re-checked on EVERY request,
 * not enforced mid-flight (documented in the v1 spec §0/§9).
 */
export async function authenticateBearer(
  req: Request
): Promise<
  | { ok: true; key: AuthedKey }
  | { ok: false; status: number; code: string; message: string }
> {
  // 1. Read + shape-check the Authorization header.
  const header = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!header || !header.startsWith('Bearer sk_live_')) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Clé API manquante ou invalide.' }
  }
  const raw = header.slice('Bearer '.length).trim()
  if (!raw.startsWith('sk_live_')) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Clé API manquante ou invalide.' }
  }

  try {
    // 2. Hash the presented token.
    const hash = sha256Hex(raw)
    const supabase: any = await createServiceRoleClient()

    // 3. Look the key up by hash (service role).
    const { data: keyRow, error: keyErr } = await supabase
      .from('api_keys')
      .select('id, business_id, scopes, revoked_at')
      .eq('key_hash', hash)
      .maybeSingle()
    if (keyErr) {
      console.error('authenticateBearer key lookup:', keyErr?.message)
      return { ok: false, status: 500, code: 'server_error', message: 'Service momentanément indisponible.' }
    }
    if (!keyRow) {
      return { ok: false, status: 401, code: 'invalid_key', message: 'Clé API invalide.' }
    }

    // 4. Revoked?
    if (keyRow.revoked_at) {
      return { ok: false, status: 401, code: 'key_revoked', message: 'Cette clé API a été révoquée.' }
    }

    // 5. Resolve the business in ONE query, pinned to the key's business_id.
    //    The returned slug is the ONLY slug this request may use — id and slug
    //    come from the same row, so the slug-keyed redeem RPC cannot be steered
    //    to another business (IDOR guard, see spec [REVIEW DECISION A]).
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('id, slug, status')
      .eq('id', keyRow.business_id)
      .maybeSingle()
    if (bizErr) {
      console.error('authenticateBearer business lookup:', bizErr?.message)
      return { ok: false, status: 500, code: 'server_error', message: 'Service momentanément indisponible.' }
    }
    if (!business || business.status !== 'active') {
      return { ok: false, status: 403, code: 'business_inactive', message: 'Établissement indisponible.' }
    }

    // 6. Fire-and-forget last_used_at touch — never block the response on it.
    try {
      void supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRow.id)
        .then(() => {}, () => {})
    } catch {
      // ignore — telemetry only
    }

    // 7. Authenticated.
    return {
      ok: true,
      key: {
        businessId: business.id,
        slug: business.slug,
        scopes: Array.isArray(keyRow.scopes) ? keyRow.scopes : [],
        keyId: keyRow.id,
      },
    }
  } catch (e: any) {
    console.error('authenticateBearer:', e?.message)
    return { ok: false, status: 500, code: 'server_error', message: 'Service momentanément indisponible.' }
  }
}

/**
 * Enforce a required scope. Returns `null` when the key has it, else the 403
 * envelope parts for the caller to pass straight to `apiError`.
 */
export function requireScope(
  key: AuthedKey,
  scope: ApiScope
): null | { status: 403; code: 'insufficient_scope'; message: string } {
  if (key.scopes.includes(scope)) return null
  return {
    status: 403,
    code: 'insufficient_scope',
    message: 'Cette clé API ne permet pas cette action.',
  }
}
