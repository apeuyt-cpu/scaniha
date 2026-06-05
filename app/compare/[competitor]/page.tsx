import type { Metadata } from 'next'
import Link from 'next/link'

const competitors: Record<string, { name: string, description: string }> = {
  'menulog': { name: 'MenuLog', description: 'Scaniha offers a more affordable, feature-rich QR menu solution compared to traditional menu platforms.' },
  'qrmenu': { name: 'QR Menu', description: 'Scaniha provides real-time updates, multi-language support, and better analytics than basic QR menu generators.' },
  'menuly': { name: 'Menuly', description: 'Scaniha is built specifically for restaurants with features like team management, analytics, and the lucky wheel game.' },
  'restomenu': { name: 'RestoMenu', description: 'Scaniha offers instant QR code generation, no app requirement, and a simpler setup process.' },
}

export function generateStaticParams() {
  return Object.keys(competitors).map((competitor) => ({ competitor }))
}

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params
  const comp = competitors[competitor.toLowerCase()]
  if (!comp) {
    return { title: 'Not Found | Scaniha' }
  }
  return {
    title: `Scaniha vs ${comp.name} | QR Menu Builder Comparison`,
    description: `Compare Scaniha with ${comp.name}. See why Scaniha is the better choice for your restaurant's digital menu needs.`,
    openGraph: {
      title: `Scaniha vs ${comp.name} | Comparison`,
      description: `See why restaurants choose Scaniha over ${comp.name}.`,
      url: `https://scaniha.com/compare/${competitor}`,
      siteName: 'Scaniha',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Scaniha vs ${comp.name}`,
      description: `See why restaurants choose Scaniha over ${comp.name}.`,
    },
  }
}

export default async function ComparePage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params
  const comp = competitors[competitor.toLowerCase()]

  if (!comp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Comparison Not Found</h1>
          <Link href="/" className="text-orange-600 hover:underline">Back to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Scaniha vs {comp.name}</h1>
        <p className="text-xl text-zinc-600 mb-12">{comp.description}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Why Choose Scaniha?</h2>
          <ul className="space-y-4 text-zinc-600">
            <li className="flex items-start gap-3"><span className="text-green-500 font-bold mt-1">✓</span> <span><strong>Real-Time Updates:</strong> Change your menu instantly — no delays, no app updates.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-500 font-bold mt-1">✓</span> <span><strong>Multi-Language:</strong> Serve customers in English, Arabic, and French seamlessly.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-500 font-bold mt-1">✓</span> <span><strong>No App Required:</strong> Customers scan and view instantly. Zero friction.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-500 font-bold mt-1">✓</span> <span><strong>Built for Hospitality:</strong> Features designed specifically for restaurants and cafes.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-500 font-bold mt-1">✓</span> <span><strong>Affordable Pricing:</strong> Start free, then choose from flexible plans that fit your budget.</span></li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Comparison Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 font-bold text-zinc-900">Feature</th>
                  <th className="text-left py-3 px-4 font-bold text-orange-600">Scaniha</th>
                  <th className="text-left py-3 px-4 font-bold text-zinc-500">{comp.name}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Real-Time Updates', '✓', '~'],
                  ['Multi-Language', '✓', '~'],
                  ['No App Required', '✓', '✓'],
                  ['Menu Analytics', '✓', '~'],
                  ['Team Management', '✓', '✗'],
                  ['Lucky Wheel Game', '✓', '✗'],
                  ['7-Day Free Trial', '✓', '~'],
                  ['Priority Support', '✓', '~'],
                ].map(([feature, scaniha, other], i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-3 px-4 text-zinc-700 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-green-600 font-bold">{scaniha}</td>
                    <td className="py-3 px-4 text-zinc-400">{other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Try Scaniha Free</Link>
        </div>
      </div>
    </div>
  )
}
