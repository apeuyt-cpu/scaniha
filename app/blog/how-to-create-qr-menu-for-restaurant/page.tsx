import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Create a QR Menu for Your Restaurant | Step-by-Step Guide | Scaniha',
  description: 'Learn how to create a QR menu for your restaurant step by step. From signing up to printing QR codes, this complete guide walks you through everything.',
  openGraph: { title: 'How to Create a QR Menu for Your Restaurant | Step-by-Step Guide', description: 'Learn how to create a QR menu for your restaurant step by step.', url: 'https://scaniha.com/blog/how-to-create-qr-menu-for-restaurant', siteName: 'Scaniha', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'How to Create a QR Menu for Your Restaurant', description: 'Learn how to create a QR menu for your restaurant step by step.' },
  alternates: { canonical: 'https://scaniha.com/blog/how-to-create-qr-menu-for-restaurant' },
}

export default function Post() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Blog</Link>
        <article>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">How to Create a QR Menu for Your Restaurant — Step-by-Step Guide</h1>
          <time className="text-zinc-500 mb-8 block">January 15, 2026</time>

          <div className="prose prose-lg max-w-none text-zinc-700 space-y-6">
            <p>Creating a QR menu for your restaurant is one of the smartest investments you can make. It saves money on printing, reduces contact, and lets you update prices instantly. Here is exactly how to do it with Scaniha.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 1: Sign Up for Scaniha</h2>
            <p>Go to <Link href="/signup" className="text-orange-600">scaniha.com/signup</Link> and create your free account. No credit card is required for the 7-day trial. Enter your email, choose a password, and your business name.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 2: Add Your Menu Items</h2>
            <p>Use Scaniha&apos;s menu builder to add categories (Appetizers, Main Courses, Desserts, Drinks) and items under each category. For each item, add a name, price, description, and optional photo. You can import items from an Excel spreadsheet too.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 3: Customize Your Theme</h2>
            <p>Choose from premium themes and customize colors to match your restaurant branding. Set a primary color that matches your restaurant logo and decor.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 4: Generate Your QR Code</h2>
            <p>Scaniha automatically generates a unique QR code for your menu. Download it as a high-resolution image ready for printing. You can also share the menu link on social media or your website.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 5: Print and Display</h2>
            <p>Print your QR code on table tents, placemats, window stickers, or flyers. Customers scan the code with any smartphone camera and view your menu instantly in their browser.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Step 6: Update in Real-Time</h2>
            <p>Whenever you need to change prices, add new items, or remove sold-out dishes, update it in Scaniha. Changes appear instantly — no reprinting needed.</p>

            <div className="bg-orange-50 p-6 rounded-2xl mt-8">
              <p className="text-lg font-semibold text-zinc-900">Ready to create your QR menu?</p>
              <Link href="/signup" className="inline-block mt-4 px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-bold shadow-lg">Start Free Trial</Link>
            </div>

            <p className="mt-8">Related: <Link href="/blog/benefits-of-digital-menus" className="text-orange-600">Benefits of digital menus for restaurants</Link> · <Link href="/blog/qr-code-best-practices-restaurants" className="text-orange-600">QR code best practices</Link></p>
          </div>
        </article>
      </div>
    </div>
  )
}
