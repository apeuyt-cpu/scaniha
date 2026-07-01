import { NextResponse } from 'next/server'
import { cleanEmail, issueSignupCode, isValidEmail } from '../store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = cleanEmail(body.email)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Veuillez saisir une adresse email valide.' }, { status: 400 })
    }

    const issued = issueSignupCode(email)
    if (!issued.ok) {
      return NextResponse.json({ error: 'Patientez avant de renvoyer un code.', retryAfter: issued.retryAfter }, { status: 429 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const from = process.env.RESEND_FROM_EMAIL || 'Scaniha <onboarding@resend.dev>'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: email,
          subject: 'Votre code de vérification Scaniha',
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.55;color:#18181b">
              <h1 style="font-size:22px;margin:0 0 12px">Code de vérification Scaniha</h1>
              <p>Voici votre code pour créer votre compte :</p>
              <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:18px 0">${issued.code}</p>
              <p>Ce code expire dans 10 minutes.</p>
            </div>
          `,
          text: `Votre code de vérification Scaniha est ${issued.code}. Il expire dans 10 minutes.`,
        }),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[signup-code] Resend error:', detail)

        // In development: Resend test domain can only send to the account owner's email.
        // Fall back to console so signup can still be tested without a verified domain.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️  [signup-code] Resend rejected the email (likely domain restriction).')
          console.warn('    To fix in production: verify your domain on resend.com and set RESEND_FROM_EMAIL.')
          console.log(`\n🔑 [signup-code] DEV FALLBACK — code for ${email}: ${issued.code}\n`)
          // Return success so the UI can proceed; user reads code from this terminal.
          return NextResponse.json({ ok: true, retryAfter: issued.retryAfter, devFallback: true })
        }

        return NextResponse.json({ error: "Impossible d'envoyer le code. Veuillez réessayer." }, { status: 502 })
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[signup-code] ${email}: ${issued.code}`)
    } else {
      return NextResponse.json({ error: 'RESEND_API_KEY est manquant.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, retryAfter: issued.retryAfter })
  } catch (error: any) {
    console.error('[signup-code] send error:', error?.message)
    return NextResponse.json({ error: 'Service momentanément indisponible.' }, { status: 500 })
  }
}

