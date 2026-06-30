/**
 * "Scan the café QR" prompt — shown when the QR-session gate blocks an action
 * (HTTP 403, `rescanRequired`) instead of a raw red error box. Accent-themed so
 * it matches each café's brand. Junk/placeholder messages (e.g. "Block") fall
 * back to a clear default; a real owner sentence is shown as-is.
 */
export default function ScanGateNotice({
  message,
  accent,
  heading = 'Scannez le QR du café',
  className = 'mt-4',
}: {
  message: string
  accent: string
  heading?: string
  className?: string
}) {
  const trimmed = (message || '').trim()
  const detail = trimmed.length >= 12 ? trimmed : 'Scannez le code affiché dans l’établissement, puis réessayez.'
  return (
    <div
      className={`${className} relative overflow-hidden rounded-2xl border bg-white px-5 py-6 text-center shadow-[0_12px_34px_-20px_rgba(0,0,0,0.3)]`}
      style={{ borderColor: `${accent}33` }}
    >
      {/* Brand accent sweep along the top edge. */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} aria-hidden="true" />
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}14`, color: accent }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h3v3h-3zM20 17v4M17 20h4" />
        </svg>
      </div>
      <p className="mt-3 text-[15px] font-bold text-[#1A1410]">{heading}</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-[#6B6258]">{detail}</p>
    </div>
  )
}
