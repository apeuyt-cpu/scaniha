/**
 * Friendly "scan the café QR" prompt — shown when the QR-session gate blocks an
 * action (HTTP 403, `rescanRequired`) instead of dumping the raw gate message
 * into a red error box. Junk/placeholder messages (e.g. "Block") are ignored in
 * favour of a clear default; a real owner sentence is shown as-is.
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
    <div className={`${className} rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center`}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white" style={{ color: accent }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h3v3h-3zM20 17v4M17 20h4" />
        </svg>
      </div>
      <p className="mt-2 text-sm font-semibold text-amber-900">{heading}</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">{detail}</p>
    </div>
  )
}
