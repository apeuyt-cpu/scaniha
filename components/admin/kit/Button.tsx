import Link from 'next/link'

const VARIANTS = {
  // Brand orange is the single accent — at most one primary per screen.
  primary: 'bg-[var(--brand)] text-white shadow-soft hover:bg-[var(--brand-600)]',
  neutral: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
  // Outlined neutral — for secondary actions that still need presence.
  outline: 'border border-[var(--line)] bg-white text-zinc-700 shadow-soft hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  // Confirming/collecting at the caisse (success semantics).
  success: 'bg-green-600 text-white hover:bg-green-700',
  // Irreversible actions.
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

/**
 * The single admin button (v2 kit). Same API as the legacy ui/Button —
 * `variant` + optional `href` — plus two new variants (`outline`, `danger`).
 */
export default function Button({
  variant = 'neutral',
  href,
  className = '',
  children,
  ...props
}: {
  variant?: keyof typeof VARIANTS
  href?: string
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${VARIANTS[variant]} ${className}`
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  )
}
