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
    const { email, code, password, passwordConfirm } = await request.json()

    if (!email || !code || !password || !passwordConfirm) {
      return NextResponse.json(
        { error: 'Email, code, and passwords are required' },
        { status: 400 }
      )
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: 'Les mots de passe ne correspondent pas.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Verify the code is still valid
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

    // Get the user
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
      return NextResponse.json(
        { error: 'Utilisateur non trouvé.' },
        { status: 404 }
      )
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Impossible de mettre à jour le mot de passe. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    // Mark the reset token as used
    const { error: deleteError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('id', resetToken.id)

    if (deleteError) {
      console.error('Error deleting reset token:', deleteError)
      // Don't fail the request just because of this
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in reset-password:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
