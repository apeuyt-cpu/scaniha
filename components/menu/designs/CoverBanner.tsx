/** Optional cover/banner image strip shown at the top of a design when set. */
export default function CoverBanner({ src }: { src: string | null | undefined }) {
  if (!src) return null
  return (
    <div className="px-4 pt-4 lg:px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="h-36 w-full rounded-3xl object-cover shadow-sm ring-1 ring-black/5 lg:h-52"
      />
    </div>
  )
}
