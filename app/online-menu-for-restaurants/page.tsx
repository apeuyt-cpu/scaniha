import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Online Menu for Restaurants | Digital Restaurant Menu | Scaniha',
  description: 'Create an online menu for your restaurant with Scaniha. Share your menu via QR code, link, or social media. Update in real-time. Free trial available.',
  openGraph: { title: 'Online Menu for Restaurants | Digital Restaurant Menu | Scaniha', description: 'Create an online menu for your restaurant with Scaniha. Share via QR code or link.', url: 'https://scaniha.com/online-menu-for-restaurants', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Online Menu for Restaurants | Digital Restaurant Menu | Scaniha', description: 'Create an online menu for your restaurant with Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/online-menu-for-restaurants' },
}

export default function OnlineMenuForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Online Menu for Restaurants</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Take your restaurant menu online with Scaniha. Share your digital menu via QR code, direct link, or social media. Update items and prices instantly.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Share Anywhere</h2><p className="text-zinc-600">Your online menu works on QR codes, website embeds, social media links, and SMS. Customers can access it from anywhere.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Real-Time Updates</h2><p className="text-zinc-600">Change prices, add daily specials, or remove sold-out items instantly. Your online menu is always current.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Beautiful Design</h2><p className="text-zinc-600">Choose from customizable themes that match your brand. Your online menu looks professional on any device.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Customer Insights</h2><p className="text-zinc-600">Track which items get the most views, understand customer preferences, and optimize your menu.</p></div>
        </div>
        <div className="text-center"><Link href="/free-qr-menu" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Try free QR menu →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Create Your Online Menu</Link></div>
        <div className="mt-16 text-center"><Link href="/cafe-digital-menu" className="text-orange-600 font-semibold hover:text-orange-700">Digital menu for cafés →</Link></div>
      </div>
    </div>
  )
}
