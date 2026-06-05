import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'QR Menu for Restaurants | Free QR Menu Builder | Scaniha',
  description: 'Create a free QR menu for your restaurant with Scaniha. Generate QR codes, manage items in real-time, and offer contactless dining. No app required. Start now.',
  openGraph: { title: 'QR Menu for Restaurants | Free QR Menu Builder | Scaniha', description: 'Create a free QR menu for your restaurant. No app download needed.', url: 'https://scaniha.com/qr-menu-for-restaurants', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'QR Menu for Restaurants | Free QR Menu Builder | Scaniha', description: 'Create a free QR menu for your restaurant. Generate QR codes instantly.' },
  alternates: { canonical: 'https://scaniha.com/qr-menu-for-restaurants' },
}

export default function QRMenuForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">QR Menu for Restaurants</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Replace paper menus with a modern QR menu for your restaurant. Customers scan, view, and order — no app required.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100 text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Instant QR Generation</h2><p className="text-zinc-600">Create a unique QR code for your restaurant menu in seconds. Print it on table tents, flyers, or windows.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100 text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Real-Time Updates</h2><p className="text-zinc-600">Change prices, add daily specials, or update items instantly. Your QR menu stays current without reprinting.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100 text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Contactless & Safe</h2><p className="text-zinc-600">Offer a touch-free dining experience. Customers scan with their phone camera — no downloads or logins.</p></div>
        </div>
        <div className="text-center"><Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">See all features →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Create Your QR Menu Free</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">View pricing →</Link></div>
      </div>
    </div>
  )
}
