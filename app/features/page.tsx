import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Features | Scaniha - QR Menu Builder',
  description: 'Explore all features of Scaniha digital QR menu builder. Real-time updates, multi-language support, analytics, QR generation, and more for your restaurant.',
  openGraph: {
    title: 'Features | Scaniha - QR Menu Builder',
    description: 'Powerful features for digital restaurant menus.',
    url: 'https://scaniha.com/features',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features | Scaniha - QR Menu Builder',
    description: 'Powerful features for digital restaurant menus.',
  },
}

const features = [
  { title: 'QR Menu Builder', desc: 'Create beautiful digital menus in minutes. No coding or design skills required. Simply add your items and publish.' },
  { title: 'Instant QR Generation', desc: 'Generate unique QR codes for your menu instantly. Print them on table tents, flyers, or signage.' },
  { title: 'Real-Time Updates', desc: 'Update prices, descriptions, and items instantly. Changes reflect immediately — no app update needed.' },
  { title: 'No App Required', desc: 'Customers scan and view your menu directly in their browser. No download, no friction.' },
  { title: 'Multi-Language Support', desc: 'Create menus in English, Arabic, and French. Switch between languages effortlessly.' },
  { title: 'Multiple Themes', desc: 'Choose from professionally designed themes to match your brand identity and restaurant atmosphere.' },
  { title: 'Menu Analytics', desc: 'Track views, popular items, and customer engagement with built-in analytics dashboard.' },
  { title: 'Image Management', desc: 'Upload and manage menu item images with Cloudinary integration for optimized delivery.' },
  { title: 'Team Management', desc: 'Add team members with role-based access. Control who can edit your menu.' },
  { title: 'Lucky Wheel Game', desc: 'Engage customers with a built-in lucky wheel game. Increase interaction and repeat visits.' },
  { title: 'Social Media Links', desc: 'Add links to your social media profiles directly in your digital menu.' },
  { title: 'Excel Import/Export', desc: 'Bulk import menu items from Excel spreadsheets or export your menu for backup.' },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Everything You Need</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Scaniha provides all the tools to create, manage, and share your digital restaurant menu.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-zinc-100 hover:border-orange-200 hover:shadow-lg transition-all">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">{f.title}</h2>
              <p className="text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Get Started Free</Link>
        </div>
      </div>
    </div>
  )
}
