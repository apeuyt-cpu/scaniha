import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Free QR Menu Builder | Create a QR Menu for Free | Scaniha',
  description: 'Create a free QR menu for your restaurant or café with Scaniha. No credit card required. 7-day free trial. Generate QR codes and manage your menu online at no cost.',
  openGraph: { title: 'Free QR Menu Builder | Create a QR Menu for Free | Scaniha', description: 'Create a free QR menu with Scaniha. No credit card required. 7-day free trial.', url: 'https://scaniha.com/free-qr-menu', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Free QR Menu Builder | Create a QR Menu for Free | Scaniha', description: 'Create a free QR menu with Scaniha. No credit card required.' },
  alternates: { canonical: 'https://scaniha.com/free-qr-menu' },
}

export default function FreeQRMenuPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Free QR Menu Builder</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Create a free QR menu for your restaurant or café. No credit card required. Start with a 7-day free trial and see why restaurants love Scaniha.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Completely Free to Start</h2><p className="text-zinc-600">Sign up in 30 seconds. No credit card, no commitment. Access all features during your 7-day free trial.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Full-Featured Trial</h2><p className="text-zinc-600">Get unlimited items, categories, themes, and QR code generation. Experience everything Scaniha offers.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">No Hidden Fees</h2><p className="text-zinc-600">Transparent pricing with no surprises. Only pay when you are ready to continue after your trial.</p></div>
        </div>
        <div className="text-center"><Link href="/qr-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Learn about QR menus →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Start Free Trial</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">See paid plans →</Link></div>
      </div>
    </div>
  )
}
