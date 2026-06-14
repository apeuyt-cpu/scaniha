import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu numérique ou menu papier — Pourquoi le numérique l’emporte | Scaniha',
  description: 'Comparez les menus numériques et les menus papier pour les restaurants. Coût, flexibilité, expérience client et impact environnemental — découvrez pourquoi le numérique est le meilleur choix.',
  openGraph: { title: 'Menu numérique ou menu papier — Pourquoi le numérique l’emporte', description: 'Comparez les menus numériques et les menus papier pour les restaurants.', url: 'https://scaniha.com/blog/digital-menu-vs-paper-menu', siteName: 'Scaniha', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'Menu numérique ou menu papier — Pourquoi le numérique l’emporte', description: 'Comparez les menus numériques et les menus papier pour les restaurants.' },
  alternates: { canonical: 'https://scaniha.com/blog/digital-menu-vs-paper-menu' },
}

export default function Post() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour au blog</Link>
        <article>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">Menu numérique ou menu papier — Pourquoi le numérique l’emporte</h1>
          <time className="text-zinc-500 mb-8 block">19 février 2026</time>
          <div className="prose prose-lg max-w-none text-zinc-700 space-y-6">
            <p>Les menus papier accompagnent les restaurants depuis des siècles, mais les menus numériques sont nettement supérieurs. Voici la comparaison.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Comparaison des coûts</h2>
            <p>Menus papier : 50 à 200 TND par tirage, plus les réimpressions à chaque changement de prix. Menus numériques : une seule configuration, des mises à jour gratuites à vie. Sur une année, les menus numériques permettent d’économiser des centaines de TND.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Flexibilité</h2>
            <p>Les menus papier sont figés une fois imprimés. Les menus numériques se mettent à jour en temps réel. Ajoutez des plats du jour, ajustez les prix ou retirez les articles épuisés instantanément.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Expérience client</h2>
            <p>Les menus numériques proposent des photos, des descriptions, une prise en charge multilingue et des fonctionnalités d’accessibilité. Les clients peuvent zoomer, rechercher et naviguer à leur rythme.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Impact environnemental</h2>
            <p>Les menus papier consomment des arbres, de l’encre et du carburant pour l’acheminement. Les menus numériques sont totalement sans papier et respectueux de l’environnement.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Hygiène et sécurité</h2>
            <p>Les menus papier passent entre des centaines de mains. Les menus numériques sont sans contact — les clients les consultent sur leur propre téléphone.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Le verdict</h2>
            <p>Les menus numériques font économiser de l’argent, offrent plus de flexibilité, une meilleure expérience client et respectent l’environnement. Faites le changement dès aujourd’hui.</p>
            <div className="bg-orange-50 p-6 rounded-2xl mt-8"><Link href="/signup" className="inline-block px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-bold shadow-lg">Passez au menu numérique gratuitement</Link></div>
            <p>À lire aussi : <Link href="/blog/benefits-of-digital-menus" className="text-orange-600">Les avantages des menus numériques</Link> · <Link href="/digital-menu-builder" className="text-orange-600">Créateur de menu numérique</Link></p>
          </div>
        </article>
      </div>
    </div>
  )
}
