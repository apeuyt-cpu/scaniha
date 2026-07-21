import { NextResponse } from 'next/server'
import {
  cleanEmail,
  createCodeCookie,
  findUserByEmail,
  passwordResetCookies,
  readCodeCookie,
  validateRealEmail,
} from '../store'

export const runtime = 'nodejs'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = cleanEmail(body.email)
    const emailCheck = await validateRealEmail(email)
    if (!emailCheck.ok) return NextResponse.json({ error: emailCheck.message }, { status: 400 })

    const existing = readCodeCookie(request.headers.get('cookie')?.match(/(?:^|;\s*)scaniha_pr_code=([^;]+)/)?.[1])
    if (existing?.email === email && existing.sendAfter > Date.now()) {
      return NextResponse.json(
        { error: 'Patientez avant de renvoyer un code.', retryAfter: Math.ceil((existing.sendAfter - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: 'Aucun compte Scaniha ne correspond à cette adresse email.' }, { status: 404 })
    }

    const issued = createCodeCookie(email, user.userId)
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.PASSWORD_RESET_FROM_EMAIL || 'Scaniha <noreply@scaniha.com>',
          to: email,
          subject: 'Code de réinitialisation Scaniha',
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.55;color:#18181b">
              <h1 style="font-size:22px;margin:0 0 12px">Réinitialisation du mot de passe</h1>
              <p>Voici votre code pour modifier le mot de passe de votre compte Scaniha :</p>
              <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:18px 0">${issued.code}</p>
              <p>Ce code expire dans 10 minutes. Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
            </div>
          `,
          text: `Votre code de réinitialisation Scaniha est ${issued.code}. Il expire dans 10 minutes.`,
        }),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[password-reset] Resend error:', detail)
        return NextResponse.json({ error: "Impossible d'envoyer le code. Veuillez réessayer." }, { status: 502 })
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[password-reset] ${email}: ${issued.code}`)
    } else {
      return NextResponse.json({ error: 'RESEND_API_KEY est manquant.' }, { status: 500 })
    }

    const response = NextResponse.json({ ok: true, retryAfter: issued.retryAfter })
    response.cookies.set(passwordResetCookies.code, issued.token, { ...cookieOptions, maxAge: 10 * 60 })
    response.cookies.delete(passwordResetCookies.reset)
    return response
  } catch (error: any) {
    console.error('[password-reset] send error:', error?.message)
    return NextResponse.json({ error: 'Service momentanément indisponible.' }, { status: 500 })
  }
}

