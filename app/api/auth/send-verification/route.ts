import { NextResponse } from 'next/server'
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email'
import { createVerificationCode, canSendCode } from '@/lib/db/verification-codes'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const rateCheck = await canSendCode(normalizedEmail)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Veuillez attendre ${rateCheck.waitSeconds} seconde(s) avant de demander un nouveau code.` },
        { status: 429 }
      )
    }

    const { code, codeHash } = generateVerificationCode()
    await createVerificationCode(normalizedEmail, codeHash)
    await sendVerificationEmail(normalizedEmail, code)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('send-verification error:', err?.message)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du code.' }, { status: 500 })
  }
}
