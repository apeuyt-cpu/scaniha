import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Digital Menu for Cafés | QR Menu for Coffee Shops | Scaniha',
  description: 'Create a digital menu for your café or coffee shop with Scaniha. Beautiful QR menu builder designed for cafés. Display drinks, pastries, and daily specials. Free trial.',
  openGraph: { title: 'Digital Menu for Cafés | QR Menu for Coffee Shops | Scaniha', description: 'Create a digital menu for your café with Scaniha. Beautiful QR menu for coffee shops.', url: 'https://scaniha.com/cafe-digital-menu', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Digital Menu for Cafés | QR Menu for Coffee Shops | Scaniha', description: 'Create a digital menu for your café with Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/cafe-digital-menu' },
}

export default function CafeDigitalMenuPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Digital Menu for Cafés</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Create a beautiful digital menu for your café or coffee shop. Display your drinks, pastries, and daily specials with a simple QR scan.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Perfect for Cafés</h2><p className="text-zinc-600">Showcase coffee varieties, teas, pastries, and seasonal specials. Categorize drinks by type — hot, cold, signature.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Daily Specials</h2><p className="text-zinc-600">Add daily specials or seasonal menus in seconds. Highlight featured items with images and descriptions.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Table QR Codes</h2><p className="text-zinc-600">Place QR codes on each table. Customers browse your café menu instantly without waiting for a server.</p></div>
        </div>
        <div className="text-center"><Link href="/online-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Online menu for restaurants →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Create Your Café Menu</Link></div>
        <div className="mt-16 text-center"><Link href="/free-qr-menu" className="text-orange-600 font-semibold hover:text-orange-700">Try free QR menu →</Link></div>
      </div>
    </div>
  )
}
