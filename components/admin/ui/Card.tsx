import Link from 'next/link'

/** White hairline card. Pass `href` to make the whole card a navigation link. */
export default function Card({
  href,
  interactive,
  className = '',
  children,
}: {
  href?: string
  interactive?: boolean
  className?: string
  children: React.ReactNode
}) {
  const base = `rounded-2xl border border-zinc-200 bg-white p-5 ${
    interactive ? 'transition hover:border-zinc-300 hover:shadow-sm active:scale-[0.995]' : ''
  } ${className}`
  if (href) {
    return (
      <Link href={href} className={`block ${base}`}>
        {children}
      </Link>
    )
  }
  return <div className={base}>{children}</div>
}
