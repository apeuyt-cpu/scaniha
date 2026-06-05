import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Restaurant QR Code Menu | Digital Menu with QR Codes | Scaniha',
  description: 'Turn your restaurant menu into a QR code menu. Customers scan and view instantly. No app download. Free trial available. Create your restaurant QR code menu today.',
  openGraph: { title: 'Restaurant QR Code Menu | Digital Menu with QR Codes | Scaniha', description: 'Turn your restaurant menu into a QR code menu. Customers scan and view instantly.', url: 'https://scaniha.com/restaurant-qr-code-menu', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Restaurant QR Code Menu | Digital Menu with QR Codes | Scaniha', description: 'Turn your restaurant menu into a QR code menu with Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/restaurant-qr-code-menu' },
}

export default function RestaurantQRCodeMenuPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Restaurant QR Code Menu</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Replace paper menus with a modern restaurant QR code menu. Generate a unique QR code, print it on your tables, and let customers view your menu instantly.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Why QR Menus?</h2><p className="text-zinc-600">Cost-effective, hygienic, and always up-to-date. No more reprinting menus when prices or items change.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">How It Works</h2><p className="text-zinc-600">Sign up, add your menu items, generate a QR code, and place it on tables. Customers scan with any smartphone camera.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Works Everywhere</h2><p className="text-zinc-600">No special hardware needed. Works on any smartphone with a camera. Customers just point, scan, and browse.</p></div>
        </div>
        <div className="text-center"><Link href="/digital-menu-builder" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Explore digital menu builder →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Create Your QR Menu Free</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">View plans →</Link></div>
      </div>
    </div>
  )
}
