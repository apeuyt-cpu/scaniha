import Link from 'next/link'

const VARIANTS = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600',
  neutral: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  // Reserved for confirming/collecting actions at the caisse (success semantics).
  success: 'bg-green-600 text-white hover:bg-green-700',
}

/**
 * The single admin button. `primary` is the only place orange appears — there
 * should be at most one primary action per screen. Pass `href` for a link.
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
