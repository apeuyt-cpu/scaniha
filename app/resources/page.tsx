import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Resources | Scaniha - QR Menu Builder Guide',
  description: 'Learn how to create and optimize your digital QR menu. Guides, tips, and best practices for restaurant digital menus.',
  openGraph: {
    title: 'Resources | Scaniha - QR Menu Guide',
    description: 'Guides and best practices for digital restaurant menus.',
    url: 'https://scaniha.com/resources',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resources | Scaniha - QR Menu Guide',
    description: 'Guides and best practices for digital restaurant menus.',
  },
}

const articles = [
  { title: 'How to Create a QR Menu for Your Restaurant', desc: 'Step-by-step guide to creating your first digital QR menu. From setup to publishing in minutes.' },
  { title: 'Benefits of Digital Menus for Restaurants', desc: 'Why restaurants are switching to digital menus. Cost savings, flexibility, and improved customer experience.' },
  { title: 'QR Code Best Practices for Restaurants', desc: 'Tips for placing and promoting your QR menu. Maximize scans and customer engagement.' },
  { title: 'Multi-Language Menu Guide', desc: 'How to create menus in multiple languages. Serve diverse customers with English, Arabic, and French.' },
  { title: 'Menu Design Tips for Better Sales', desc: 'Optimize your menu layout and pricing to increase average order value and customer satisfaction.' },
  { title: 'Digital Menu Analytics Guide', desc: 'Track menu views, popular items, and customer behavior. Make data-driven decisions for your menu.' },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Resources & Guides</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Learn everything about digital QR menus for your restaurant or cafe.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((a, i) => (
            <article key={i} className="p-6 rounded-2xl border border-zinc-100 hover:border-orange-200 hover:shadow-lg transition-all">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">{a.title}</h2>
              <p className="text-zinc-600 mb-4">{a.desc}</p>
              <Link href="/signup" className="text-orange-600 font-semibold hover:text-orange-700 text-sm">Learn more →</Link>
            </article>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Get Started Free</Link>
        </div>
      </div>
    </div>
  )
}
