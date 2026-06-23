import { cloneElement, isValidElement, useId } from 'react'

/** Shared input styling so every admin form field looks the same. */
export const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30'

/** Labeled wrapper for an input/textarea/control. */
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
  // Use an explicit htmlFor when given; otherwise generate a stable id and attach
  // it to the single input/select/textarea child so screen readers announce a name.
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
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {child}
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}
