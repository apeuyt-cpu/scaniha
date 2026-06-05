import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Digital Menu Builder | Create Online Restaurant Menus | Scaniha',
  description: 'Build beautiful digital menus for your restaurant or café with Scaniha. Easy drag-and-drop menu builder. Generate QR codes, manage categories, and update prices in real-time.',
  openGraph: { title: 'Digital Menu Builder | Create Online Restaurant Menus | Scaniha', description: 'Build beautiful digital menus for your restaurant. Easy drag-and-drop builder.', url: 'https://scaniha.com/digital-menu-builder', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Digital Menu Builder | Create Online Restaurant Menus | Scaniha', description: 'Build beautiful digital menus for your restaurant with Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/digital-menu-builder' },
}

export default function DigitalMenuBuilderPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Digital Menu Builder</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">The easiest digital menu builder for restaurants and cafés. Create, customize, and publish your menu online in minutes.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Drag-and-Drop Builder</h2><p className="text-zinc-600">Add items, categories, prices, and descriptions with an intuitive interface. No coding or design skills needed.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Multi-Language Support</h2><p className="text-zinc-600">Create menus in English, Arabic, and French. Perfect for restaurants serving international customers.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Custom Themes</h2><p className="text-zinc-600">Choose from premium themes and customize colors to match your restaurant branding.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-100"><h2 className="text-xl font-bold text-zinc-900 mb-3">Analytics Dashboard</h2><p className="text-zinc-600">Track menu views, popular items, and customer engagement with built-in analytics.</p></div>
        </div>
        <div className="text-center"><Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Explore features →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Start Building Your Menu</Link></div>
        <div className="mt-16 text-center"><Link href="/qr-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700">Create a QR menu for your restaurant →</Link></div>
      </div>
    </div>
  )
}
