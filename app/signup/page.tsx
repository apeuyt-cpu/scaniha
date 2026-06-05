import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign Up | Scaniha - QR Menu Builder',
  description: 'Create your free Scaniha account and start building beautiful digital QR menus for your restaurant, cafe, or food business in minutes.',
  openGraph: {
    title: 'Sign Up | Scaniha - QR Menu Builder',
    description: 'Create your free digital QR menu for your restaurant or cafe.',
    url: 'https://scaniha.com/signup',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Up | Scaniha - QR Menu Builder',
    description: 'Create your free digital QR menu for your restaurant or cafe.',
  },
}

export default function SignupPage({ searchParams }: { searchParams?: { plan?: string } }) {
  const plan = searchParams?.plan

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">العودة للصفحة الرئيسية</span>
          </Link>

          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Scaniha"
                width={180}
                height={60}
                className="object-contain"
                priority
                fetchPriority="high"
              />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-2">
              إنشاء حساب جديد
            </h1>
            <p className="text-zinc-500 text-sm">
              ابدأ رحلتك مع Scaniha
            </p>
          </div>

          <SignupForm plan={plan} />
        </div>

        <div className="text-center mt-6">
          <a 
            href="/login" 
            className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
          >
            لديك حساب بالفعل؟ <span className="text-zinc-900 font-semibold">سجل الدخول</span>
          </a>
        </div>
      </div>
    </div>
  )
}
