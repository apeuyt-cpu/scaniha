import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us | Scaniha QR Menu Support',
  description: 'Get in touch with Scaniha. Contact our support team for help with your digital QR menu. Email us or visit our help center.',
  openGraph: { title: 'Contact Us | Scaniha QR Menu Support', description: 'Get in touch with Scaniha support.', url: 'https://scaniha.com/contact', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Contact Us | Scaniha QR Menu Support', description: 'Get in touch with Scaniha support.' },
  alternates: { canonical: 'https://scaniha.com/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Contact Us</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Have questions about Scaniha? We are here to help.</p>
        </div>
        <div className="max-w-md mx-auto space-y-8">
          <div className="p-6 rounded-2xl border border-zinc-100 text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Email</h2>
            <a href="mailto:support@scaniha.com" className="text-orange-600 font-semibold hover:text-orange-700">support@scaniha.com</a>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-100 text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Quick Links</h2>
            <div className="flex flex-col gap-3">
              <Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">View Pricing</Link>
              <Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700">Explore Features</Link>
              <Link href="/about" className="text-orange-600 font-semibold hover:text-orange-700">About Scaniha</Link>
            </div>
          </div>
        </div>
        <div className="text-center mt-12"><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Get Started Free</Link></div>
      </div>
    </div>
  )
}
