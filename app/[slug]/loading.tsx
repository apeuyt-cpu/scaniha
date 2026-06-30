// Shown by Next.js while the menu route's async server component awaits Supabase
// (getBusinessBySlug + getBusinessWithCategoriesAndItems). Replaces the blank
// white flash on a slow DB with a lightweight, on-brand shimmer skeleton.

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F6F4F0]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement du menu…</span>

      <style>{`
        @keyframes sk-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .sk {
          background: linear-gradient(90deg, rgba(244,123,32,0.07) 25%, rgba(245,184,46,0.16) 37%, rgba(244,123,32,0.07) 63%);
          background-size: 200% 100%;
          animation: sk-shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) { .sk { animation: none } }
      `}</style>

      <div className="mx-auto max-w-md px-6 pb-12 pt-9 lg:max-w-2xl">
        {/* Brand logo placeholder + title */}
        <div className="flex items-center gap-3">
          <div className="sk h-11 w-11 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="sk h-3 w-24 rounded-full" />
            <div className="sk mt-2 h-6 w-48 rounded-lg" />
          </div>
        </div>

        {/* Search bar placeholder */}
        <div className="sk mt-5 h-12 w-full rounded-2xl" />

        {/* CTA placeholder */}
        <div className="sk mt-3 h-12 w-full rounded-2xl" />

        {/* Hero card placeholder */}
        <div className="sk mt-7 h-44 w-full rounded-3xl lg:h-64" />

        {/* Category pills placeholder */}
        <div className="mt-7 flex gap-2 overflow-hidden">
          {[64, 88, 76, 70].map((w, i) => (
            <div key={i} className="sk h-9 shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* List item placeholders */}
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-[20px] bg-white p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="sk h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="sk h-4 w-2/3 rounded-full" />
                <div className="sk mt-2 h-3 w-1/2 rounded-full" />
              </div>
              <div className="sk h-4 w-12 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
