import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { passwordResetCookies, readResetCookie, validatePassword } from '../store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = typeof body.password === 'string' ? body.password : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
    const passwordError = validatePassword(password, confirmPassword)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const payload = readResetCookie(request.headers.get('cookie')?.match(/(?:^|;\s*)scaniha_pr_reset=([^;]+)/)?.[1])
    if (!payload) {
      return NextResponse.json({ error: 'Session de réinitialisation expirée. Recommencez avec votre email.' }, { status: 400 })
    }

    const admin: any = await createServiceRoleClient()
    const { error } = await admin.auth.admin.updateUserById(payload.userId, {
      password,
      email_confirm: true,
    })

    if (error) {
      console.error('[password-reset] update error:', error.message)
      return NextResponse.json({ error: 'Impossible de modifier le mot de passe. Veuillez réessayer.' }, { status: 500 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.delete(passwordResetCookies.reset)
    return response
  } catch (error: any) {
    console.error('[password-reset] complete error:', error?.message)
    return NextResponse.json({ error: 'Service momentanément indisponible.' }, { status: 500 })
  }
}

