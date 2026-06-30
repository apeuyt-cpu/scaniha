import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Verify the code
    const { data: resetToken, error: queryError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('token', code.toString().trim())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      console.error('Error verifying code:', queryError)
      return NextResponse.json(
        { error: 'Une erreur est survenue. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Code invalide ou expiré. Veuillez demander un nouveau code.' },
        { status: 400 }
      )
    }

    // Code is valid - mark it as verified or return a session token
    return NextResponse.json(
      { 
        success: true, 
        message: 'Code vérifié avec succès.',
        resetTokenId: resetToken.id,
        userId: resetToken.user_id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in verify-reset-code:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
