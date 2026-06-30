// Per-business menu metadata lives in app/[slug]/page.tsx's generateMetadata
// (single source of truth — co-located with the page that fetches the business).
// This layout is a pure pass-through.
export default function MenuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
