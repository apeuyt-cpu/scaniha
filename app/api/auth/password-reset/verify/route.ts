import { NextResponse } from 'next/server'
import { createResetCookie, passwordResetCookies, readCodeCookie, verifyCode } from '../store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const payload = readCodeCookie(request.headers.get('cookie')?.match(/(?:^|;\s*)scaniha_pr_code=([^;]+)/)?.[1])

    if (!payload) {
      return NextResponse.json({ error: 'Code expiré. Envoyez un nouveau code.' }, { status: 400 })
    }
    if (!verifyCode(payload, code)) {
      return NextResponse.json({ error: 'Code de vérification incorrect.' }, { status: 400 })
    }

    const resetToken = createResetCookie(payload.email, payload.userId)
    const response = NextResponse.json({ ok: true, email: payload.email })
    response.cookies.set(passwordResetCookies.reset, resetToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    })
    response.cookies.delete(passwordResetCookies.code)
    return response
  } catch (error: any) {
    console.error('[password-reset] verify error:', error?.message)
    return NextResponse.json({ error: 'Service momentanément indisponible.' }, { status: 500 })
  }
}

