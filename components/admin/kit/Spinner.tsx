/** Centered loading spinner (v2 kit). Same API as legacy ui/Spinner. */
export default function Spinner() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--brand)]" />
    </div>
  )
}
