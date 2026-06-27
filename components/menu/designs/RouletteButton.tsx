// Menu and fidelity are now FULLY SEPARATE products, each with its own QR/link.
// The roulette lives ONLY in the fidelity hub (/[slug]/fidelite) — never on the
// menu. This inline menu button is therefore intentionally a no-op (it also no
// longer polls /api/game on every menu open). Kept typed so the design call-sites
// still compile; restore the previous body from git to re-merge them later.
export default function RouletteButton(_props: {
  slug?: string
  accent?: string
  gradient?: string
  font?: string
  size?: number
  rounded?: string
  className?: string
  label?: string
}) {
  return null
}
