import { NextResponse } from 'next/server'
import { cleanEmail, isValidEmail, verifySignupCode } from '../store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = cleanEmail(body.email)
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Veuillez saisir une adresse email valide.' }, { status: 400 })
    }

    const result = verifySignupCode(email, code)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[signup-code] verify error:', error?.message)
    return NextResponse.json({ error: 'Service momentanément indisponible.' }, { status: 500 })
  }
}

