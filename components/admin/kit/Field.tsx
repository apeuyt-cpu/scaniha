import { cloneElement, isValidElement, useId } from 'react'

/** Shared input styling (v2 kit). Same export name as legacy ui/Field. */
export const inputClass =
  'w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-zinc-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/25'

/** Labeled wrapper for an input/textarea/control (v2 kit). Same API as legacy ui/Field. */
export default function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  // Associate the <label> with its control programmatically (WCAG 1.3.1 / 4.1.2).
  const autoId = useId()
  const onlyChild = isValidElement(children)
    ? (children as React.ReactElement<{ id?: string }>)
    : null
  const fieldId = htmlFor ?? (onlyChild ? onlyChild.props.id ?? autoId : undefined)
  const child =
    onlyChild && !htmlFor && !onlyChild.props.id
      ? cloneElement(onlyChild, { id: autoId })
      : children

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-[var(--ink)]">
        {label}
      </label>
      {child}
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}
