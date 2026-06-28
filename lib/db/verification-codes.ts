import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createVerificationCode(email: string, codeHash: string): Promise<void> {
  const supabase = await createServiceRoleClient()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error } = await (supabase.from('verification_codes') as any).insert({
    email: email.toLowerCase().trim(),
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('createVerificationCode error:', error.message)
    throw new Error('Failed to store verification code')
  }
}

export async function getLatestCode(email: string): Promise<{
  id: string
  code_hash: string
  expires_at: string
  attempts: number
} | null> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase
    .from('verification_codes') as any)
    .select('id, code_hash, expires_at, attempts')
    .eq('email', email.toLowerCase().trim())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getLatestCode error:', error.message)
    return null
  }

  return data as { id: string; code_hash: string; expires_at: string; attempts: number } | null
}

export async function incrementAttempts(id: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { data: current } = await (supabase
    .from('verification_codes') as any)
    .select('attempts')
    .eq('id', id)
    .single()

  const next = ((current?.attempts as number) || 0) + 1

  const { error } = await (supabase
    .from('verification_codes') as any)
    .update({ attempts: next })
    .eq('id', id)

  if (error) {
    console.error('incrementAttempts error:', error.message)
  }
}

export async function deleteVerificationCode(id: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { error } = await (supabase.from('verification_codes') as any).delete().eq('id', id)

  if (error) {
    console.error('deleteVerificationCode error:', error.message)
  }
}

export async function markEmailVerifiedByEmail(email: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()

  const { error } = await (supabase
    .from('profiles') as any)
    .update({ email_verified: true })
    .eq('email', email.toLowerCase().trim())

  if (error) {
    console.error('markEmailVerifiedByEmail error:', error.message)
    return false
  }
  return true
}

export async function canSendCode(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const supabase = await createServiceRoleClient()

  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()

  const { data, error } = await (supabase
    .from('verification_codes') as any)
    .select('created_at')
    .eq('email', email.toLowerCase().trim())
    .gte('created_at', sixtySecondsAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('canSendCode error:', error.message)
    return { allowed: true }
  }

  if (data) {
    const elapsed = Date.now() - new Date(data.created_at).getTime()
    const waitSeconds = Math.ceil((60 * 1000 - elapsed) / 1000)
    return { allowed: false, waitSeconds }
  }

  return { allowed: true }
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase
    .from('profiles') as any)
    .select('user_id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error || !data) return null
  return (data as { user_id: string }).user_id
}
