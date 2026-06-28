import { NextResponse } from 'next/server'
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email'
import { createVerificationCode, canSendCode } from '@/lib/db/verification-codes'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis.', invalidEmail: true }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email invalide.', invalidEmail: true }, { status: 400 })
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
    console.error('send-verification error:', err)
    const msg = (err?.message || '').toLowerCase()
    const statusCode = err?.statusCode || err?.status
    if (
      msg.includes('invalid') ||
      msg.includes('not a valid') ||
      msg.includes('recipient') ||
      msg.includes('email address') ||
      msg.includes('verify') ||
      msg.includes('550') ||
      msg.includes('5.1.1')
    ) {
      return NextResponse.json({ error: 'Cette adresse email semble invalide. Vérifiez-la et réessayez.', invalidEmail: true }, { status: 400 })
    }
    if (msg.includes('domain') || msg.includes('verified') || msg.includes('sender') || msg === 'unauthorized') {
      return NextResponse.json({ error: 'Erreur d\'envoi. Vérifiez la configuration email (domaine non vérifié).' }, { status: 500 })
    }
    if (statusCode === 401 || msg.includes('api key')) {
      return NextResponse.json({ error: 'Erreur de configuration email (clé API invalide).' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du code.' }, { status: 500 })
  }
}
