/** Small section label + optional hint (v2 kit). Same API as legacy ui/SectionHeader. */
export default function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}
