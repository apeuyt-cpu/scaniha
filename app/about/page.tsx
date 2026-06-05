import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | Scaniha - QR Menu Builder',
  description: 'Learn about Scaniha, the digital QR menu builder for restaurants and cafes. Founded by Hamed Dhieb to transform the restaurant experience.',
  openGraph: {
    title: 'About | Scaniha - QR Menu Builder',
    description: 'Transforming restaurant menus with QR technology.',
    url: 'https://scaniha.com/about',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About | Scaniha - QR Menu Builder',
    description: 'Transforming restaurant menus with QR technology.',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-6">About Scaniha</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Our Mission</h2>
          <p className="text-zinc-600 leading-relaxed mb-4">
            Scaniha was created to transform how restaurants, cafes, and food businesses present their menus to customers. 
            We believe that every restaurant deserves a beautiful, functional digital menu that enhances the dining experience.
          </p>
          <p className="text-zinc-600 leading-relaxed">
            Our platform eliminates the need for printed menus, reduces contact points, and provides real-time updates 
            that keep your menu accurate and engaging.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Why Scaniha?</h2>
          <ul className="space-y-3 text-zinc-600">
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Built for hospitality — every feature serves restaurant needs</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Multi-language support for diverse customer bases</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> No app required — works on any device with a camera</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Instant updates that reflect in real-time</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Affordable pricing for businesses of all sizes</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Our Story</h2>
          <p className="text-zinc-600 leading-relaxed">
            Founded by Hamed Dhieb, Scaniha started with a simple observation: restaurants needed a better way to share 
            their menus. Printed menus were expensive to update, difficult to keep accurate, and created unnecessary waste. 
            Scaniha was built to solve these problems with a simple, powerful QR menu solution.
          </p>
        </section>

        <div className="text-center mt-12">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Start Your Free Trial</Link>
        </div>
      </div>
    </div>
  )
}
