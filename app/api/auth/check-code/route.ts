import { NextResponse } from 'next/server'
import { hashCode } from '@/lib/email'
import { getLatestCode, incrementAttempts, deleteVerificationCode } from '@/lib/db/verification-codes'

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
      return NextResponse.json({ error: 'Aucun code trouvé. Demandez-en un nouveau.' }, { status: 400 })
    }

    if (new Date(record.expires_at) < new Date()) {
      await deleteVerificationCode(record.id)
      return NextResponse.json({ error: 'Code expiré.' }, { status: 400 })
    }

    if (record.attempts >= 5) {
      await deleteVerificationCode(record.id)
      return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 })
    }

    const submittedHash = hashCode(code)

    if (submittedHash !== record.code_hash) {
      await incrementAttempts(record.id)
      const remaining = 4 - record.attempts
      return NextResponse.json({ error: `Code incorrect (${remaining} tentative(s)).` }, { status: 400 })
    }

    return NextResponse.json({ success: true, codeId: record.id })
  } catch (err: any) {
    console.error('check-code error:', err?.message)
    return NextResponse.json({ error: 'Erreur de vérification.' }, { status: 500 })
  }
}
