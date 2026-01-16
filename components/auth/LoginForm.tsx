'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent multiple submissions
    if (isSubmitting || loading) {
      return
    }
    
    setError(null)
    setIsSubmitting(true)
    setLoading(true)

    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Login error:', authError)
        // Handle rate limiting specifically
        if (authError.message.includes('rate limit') || authError.message.includes('429') || authError.status === 429) {
          setError('تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.')
        } else if (authError.message === 'Invalid login credentials' || authError.message.includes('Invalid login')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        } else if (authError.status === 400) {
          setError('طلب غير صحيح. يرجى التحقق من بياناتك والمحاولة مرة أخرى.')
        } else {
          setError(authError.message || 'حدث خطأ أثناء تسجيل الدخول')
        }
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      if (!data?.user) {
        setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.')
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      // Verify session is established
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.')
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle()

      // Determine redirect URL based on role
      const redirectUrl = profile?.role === 'super_admin' ? '/super-admin' : '/admin'
      
      // Use router.push for client-side navigation
      router.push(redirectUrl)
      router.refresh() // Refresh to ensure middleware picks up the session
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع')
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <form 
      className="space-y-5" 
      onSubmit={handleSubmit} 
      method="post"
      dir="rtl"
      noValidate
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            autoFocus
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </div>
    </form>
  )
}
