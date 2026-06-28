import { NextResponse } from 'next/server'
import { hashCode } from '@/lib/email'
import {
  getLatestCode,
  incrementAttempts,
  deleteVerificationCode,
  markEmailVerifiedByEmail,
} from '@/lib/db/verification-codes'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code à 6 chiffres requis.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const record = await getLatestCode(normalizedEmail)

    if (!record) {
      return NextResponse.json({ error: 'Aucun code de vérification trouvé. Demandez-en un nouveau.' }, { status: 400 })
    }

    if (new Date(record.expires_at) < new Date()) {
      await deleteVerificationCode(record.id)
      return NextResponse.json({ error: 'Code expiré. Demandez-en un nouveau.' }, { status: 400 })
    }

    if (record.attempts >= 5) {
      await deleteVerificationCode(record.id)
      return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 429 })
    }

    const submittedHash = hashCode(code)

    if (submittedHash !== record.code_hash) {
      await incrementAttempts(record.id)
      const remaining = 4 - record.attempts
      return NextResponse.json(
        { error: `Code incorrect. Il vous reste ${remaining} tentative(s).` },
        { status: 400 }
      )
    }

    await markEmailVerifiedByEmail(normalizedEmail)
    await deleteVerificationCode(record.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('verify-email error:', err?.message)
    return NextResponse.json({ error: 'Erreur lors de la vérification.' }, { status: 500 })
  }
}
