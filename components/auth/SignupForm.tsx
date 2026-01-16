'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/utils/slug'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password || !phoneNumber || !businessName) {
      setError('يرجى ملء جميع الحقول')
      setLoading(false)
      return
    }

    const slug = generateSlug(businessName)
    
    // Check if email already exists
    const { data: existingEmail } = await (supabase
      .from('profiles') as any)
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingEmail) {
      setError('البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.')
      setLoading(false)
      return
    }
    
    // Check if business name already exists
    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      setError('اسم النشاط التجاري مستخدم بالفعل. يرجى اختيار اسم آخر.')
      setLoading(false)
      return
    }
    
    // Check if slug already exists
    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      setError('اسم النشاط التجاري يُنشئ رابط مستخدم بالفعل. يرجى اختيار اسم آخر.')
      setLoading(false)
      return
    }

    try {
      // Step 1: Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone_number: phoneNumber,
          }
        }
      })

      if (authError || !authData.user) {
        setError(authError?.message || 'فشل إنشاء حساب المستخدم')
        setLoading(false)
        return
      }

      const userId = authData.user.id

      // Step 2: Wait for profile trigger
      let profileExists = false
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        const { data: profile } = await (supabase
          .from('profiles') as any)
          .select('user_id')
          .eq('user_id', userId)
          .single()
        
        if (profile) {
          profileExists = true
          break
        }
      }

      // Step 3: Ensure profile exists
      if (!profileExists) {
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .insert({
            user_id: userId,
            email: email,
            phone_number: phoneNumber,
            role: 'owner'
          })
        
        if (profileError) {
          setError('فشل إنشاء الملف الشخصي. يرجى المحاولة مرة أخرى.')
          setLoading(false)
          return
        }
      } else {
        // Update phone number if profile exists
        await (supabase
          .from('profiles') as any)
          .update({ phone_number: phoneNumber })
          .eq('user_id', userId)
      }

      // Step 4: Create business with 7-day free trial
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 7) // 7 days from now
      
      const { error: businessError } = await (supabase
        .from('businesses') as any)
        .insert({
          owner_id: userId,
          name: businessName,
          slug: slug,
          expires_at: expirationDate.toISOString(), // 7-day free trial
          status: 'active'
        })
        .select()
        .single()

      if (businessError) {
        if (businessError.code === '23505') {
          setError('اسم النشاط التجاري مستخدم بالفعل. تم إنشاء الحساب ولكن فشل إعداد النشاط. يرجى المحاولة لاحقاً.')
        } else {
          setError(businessError.message || 'فشل إنشاء النشاط التجاري. تم إنشاء حسابك. يرجى إضافة نشاطك من لوحة التحكم.')
        }
        setLoading(false)
        setTimeout(() => {
          window.location.href = '/admin'
        }, 2000)
        return
      }

      // Success! Redirect
      window.location.href = '/admin'
    } catch (err: any) {
      setError(err.message || 'حدث خطأ. يرجى المحاولة مرة أخرى.')
      setLoading(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} dir="rtl">
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
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-2">
            رقم الهاتف
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="+21612345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            dir="ltr"
          />
        </div>
        
        <div>
          <label htmlFor="business" className="block text-sm font-medium text-zinc-700 mb-2">
            اسم النشاط التجاري
          </label>
          <input
            id="business"
            name="business"
            type="text"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="اسم المطعم أو المقهى"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      </div>

      {/* Free Trial Banner */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎁</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">تجربة مجانية لمدة 7 أيام</p>
            <p className="text-xs text-blue-700 mt-0.5">ابدأ الآن واستمتع بكل الميزات</p>
          </div>
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
          disabled={loading}
          className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
        >
          {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
        </button>
      </div>
    </form>
  )
}
