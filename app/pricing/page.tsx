import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing | Scaniha - QR Menu Builder Plans',
  description: 'Choose the perfect plan for your restaurant or cafe. Start with a 7-day free trial. 6-month, 1-year, and lifetime plans available. No hidden fees.',
  openGraph: {
    title: 'Pricing | Scaniha - QR Menu Builder',
    description: 'Affordable plans for restaurants, cafes, and food businesses. Start free.',
    url: 'https://scaniha.com/pricing',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Scaniha - QR Menu Builder',
    description: 'Affordable plans for restaurants, cafes, and food businesses.',
  },
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] via-white to-[#FAFAF8]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. No hidden fees, no surprises. Start with a 7-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 p-8 bg-white">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">6-Month Plan</h2>
            <p className="text-5xl font-extrabold text-zinc-900 mb-4">150 TND</p>
            <p className="text-sm text-zinc-500 mb-6">/6 months</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-zinc-700">✓ Unlimited menu items</li>
              <li className="flex items-center gap-2 text-zinc-700">✓ Unlimited categories</li>
              <li className="flex items-center gap-2 text-zinc-700">✓ 3 premium themes</li>
              <li className="flex items-center gap-2 text-zinc-700">✓ Priority support</li>
            </ul>
            <Link href="/signup?plan=6months" className="block w-full text-center px-6 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800">Select Plan</Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#F47B20] to-[#F5B82E] text-white p-8 md:scale-105">
            <span className="inline-block bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-extrabold mb-4">Most Popular</span>
            <h2 className="text-2xl font-bold mb-4">1-Year Plan</h2>
            <p className="text-5xl font-extrabold mb-4">250 TND</p>
            <p className="text-sm text-white/90 mb-6">/year</p>
            <p className="text-sm text-yellow-100 font-semibold mb-6">Save 50 TND vs monthly</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">✓ All 6-month features</li>
              <li className="flex items-center gap-2">✓ Free updates</li>
              <li className="flex items-center gap-2">✓ Menu analytics</li>
              <li className="flex items-center gap-2">✓ Social media links</li>
            </ul>
            <Link href="/signup?plan=1year" className="block w-full text-center px-6 py-4 bg-white text-orange-600 rounded-xl font-extrabold hover:bg-zinc-50">Select Plan</Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#1a0a2e] via-zinc-900 to-[#2a1a00] text-white p-8 border border-amber-500/40">
            <span className="inline-block bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 px-5 py-1.5 rounded-full text-sm font-extrabold mb-4">Best Value</span>
            <h2 className="text-2xl font-bold mb-4">Lifetime Plan</h2>
            <p className="text-5xl font-extrabold text-amber-300 mb-4">600 TND</p>
            <p className="text-sm text-zinc-400 mb-6">one-time payment</p>
            <p className="text-sm text-amber-400 font-bold mb-6">Save 300 TND</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">✓ All features included</li>
              <li className="flex items-center gap-2">✓ Lucky wheel game</li>
              <li className="flex items-center gap-2">✓ Analytics dashboard</li>
              <li className="flex items-center gap-2">✓ Lifetime updates</li>
            </ul>
            <Link href="/signup?plan=lifetime" className="block w-full text-center px-6 py-4 bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 rounded-xl font-extrabold hover:from-amber-300 hover:to-yellow-200">Select Plan</Link>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-zinc-600 mb-4">Start with a 7-day free trial — no payment required</p>
          <Link href="/signup" className="text-orange-600 font-semibold hover:text-orange-700 underline">Start Free Trial →</Link>
        </div>

        <section className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-zinc-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div><h3 className="font-bold text-zinc-900 mb-2">Can I switch plans later?</h3><p className="text-zinc-600">Yes, you can upgrade or downgrade your plan at any time. Changes apply to the next billing cycle.</p></div>
            <div><h3 className="font-bold text-zinc-900 mb-2">Is there a refund policy?</h3><p className="text-zinc-600">Yes, we offer a 14-day money-back guarantee on all plans. Contact our support team for assistance.</p></div>
            <div><h3 className="font-bold text-zinc-900 mb-2">What payment methods do you accept?</h3><p className="text-zinc-600">We accept credit/debit cards through our secure payment partner. All transactions are encrypted.</p></div>
          </div>
        </section>
      </div>
    </div>
  )
}
