import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Scaniha Blog | QR Menu Tips & Restaurant Digitalization Guide',
  description: 'Learn how to create digital QR menus for your restaurant. Tips, best practices, and guides on QR code menus, contactless dining, and restaurant technology.',
  openGraph: { title: 'Scaniha Blog | QR Menu Tips & Restaurant Digitalization Guide', description: 'Learn how to create digital QR menus. Tips on QR code menus and contactless dining.', url: 'https://scaniha.com/blog', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Scaniha Blog | QR Menu Tips', description: 'Learn how to create digital QR menus for your restaurant.' },
  alternates: { canonical: 'https://scaniha.com/blog' },
}

const posts = [
  { title: 'How to Create a QR Menu for Your Restaurant — Step-by-Step Guide', desc: 'Learn how to create a QR menu for your restaurant in minutes. From signup to printing QR codes, this guide covers everything.', slug: 'how-to-create-qr-menu-for-restaurant', date: '2026-01-15' },
  { title: '7 Benefits of Digital Menus for Restaurants in 2026', desc: 'Discover why restaurants are switching to digital menus. Cost savings, real-time updates, analytics, and improved customer experience.', slug: 'benefits-of-digital-menus', date: '2026-01-22' },
  { title: 'QR Code Best Practices for Restaurants — Maximize Scans', desc: 'Learn QR code best practices for restaurants. Where to place QR codes, how to promote them, and how to increase customer engagement.', slug: 'qr-code-best-practices-restaurants', date: '2026-02-05' },
  { title: 'Digital Menu vs Paper Menu — Why Digital Wins', desc: 'Compare digital menus vs paper menus for restaurants. Cost analysis, environmental impact, flexibility, and customer satisfaction.', slug: 'digital-menu-vs-paper-menu', date: '2026-02-19' },
  { title: 'The Future of Contactless Dining — Trends for 2026', desc: 'Explore the future of contactless dining. QR menus, mobile ordering, and digital transformation trends shaping the restaurant industry.', slug: 'contactless-dining-future', date: '2026-03-01' },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Scaniha Blog</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Tips, guides, and insights on QR menus, restaurant digitalization, and contactless dining.</p>
        </div>
        <div className="space-y-8">
          {posts.map((p, i) => (
            <article key={i} className="p-6 rounded-2xl border border-zinc-100 hover:border-orange-200 hover:shadow-lg transition-all">
              <time className="text-sm text-zinc-500">{p.date}</time>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-3">{p.title}</h2>
              <p className="text-zinc-600 mb-4">{p.desc}</p>
              <Link href={`/blog/${p.slug}`} className="text-orange-600 font-semibold hover:text-orange-700">Read more →</Link>
            </article>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Create Your QR Menu Free</Link>
        </div>
      </div>
    </div>
  )
}
