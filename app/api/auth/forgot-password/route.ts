import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateEmailDomain, DEFAULT_VALIDATION_CONFIG } from '@/lib/utils/email-domain-validator'
import { Resend } from 'resend'

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

// Initialize Resend email service
const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Send email with OTP using Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      // Log to console for debugging if API key not set
      console.log(`[DEBUG] Reset code for ${user.email}: ${otp}`)
      // Still return success so user experience isn't interrupted
      return NextResponse.json(
        { 
          success: true, 
          message: 'Un code de vérification a été envoyé à votre adresse email.',
        },
        { status: 200 }
      )
    }

    try {
      await resend.emails.send({
        from: 'Scaniha <noreply@scaniha.fr>',
        to: user.email!,
        subject: 'Réinitialiser votre mot de passe - Code de vérification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EA580C;">Réinitialisation de mot de passe</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe Scaniha.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">Votre code de vérification est:</p>
              <p style="margin: 10px 0; font-size: 36px; font-weight: bold; letter-spacing: 2px; color: #EA580C;">${otp}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">© 2024 Scaniha. Tous droits réservés.</p>
          </div>
        `,
      })

      return NextResponse.json(
        { 
          success: true, 
          message: 'Un code de vérification a été envoyé à votre adresse email.',
        },
        { status: 200 }
      )
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Still return success so user can check their email/spam
      return NextResponse.json(
        { 
          success: true, 
          message: 'Un code de vérification a été envoyé à votre adresse email.',
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
