'use client'

/**
 * Small, clean attribution badge fixed at the bottom-right of every public
 * menu. It's the growth loop: each diner who scans sees "Créé avec Scaniha"
 * and can tap through to the marketing site — turning menus into acquisition.
 * Subtle by default, lifts slightly on hover so it's easy to spot.
 */
export default function PoweredByScaniha() {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Créé avec Scaniha — créez votre menu QR"
      title="Créé avec Scaniha"
      className="fixed bottom-[5.25rem] left-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-lg shadow-black/10 backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Scaniha" className="h-5 w-5 object-contain" draggable={false} />
    </a>
  )
}
