import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateEmailDomain, DEFAULT_VALIDATION_CONFIG } from '@/lib/utils/email-domain-validator'

// Use service role for password reset operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    // Validate email domain (server-side security check)
    const domainValidation = validateEmailDomain(normalizedEmail, DEFAULT_VALIDATION_CONFIG)
    if (!domainValidation.valid) {
      return NextResponse.json(
        { error: domainValidation.error || 'Ce domaine d\'email n\'est pas accepté.' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Une erreur est survenue. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    const user = userList.users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      // For security, don't reveal that the email doesn't exist
      return NextResponse.json(
        { 
          success: true, 
          message: 'Si cet email est associé à un compte, vous recevrez un code de vérification.' 
        },
        { status: 200 }
      )
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store the OTP in the database with an expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: user.email,
        token: otp,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Error storing reset token:', insertError)
      return NextResponse.json(
        { error: 'Une erreur est survenue. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    // Send email with OTP (you would integrate with a service like SendGrid, Mailgun, or Resend)
    // For now, we'll just return success
    // In production, send the email here
    console.log(`Reset code for ${user.email}: ${otp}`)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Un code de vérification a été envoyé à votre adresse email.',
        email: user.email // Only for demonstration, remove in production
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
