'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * "Scanner le QR du client" — opens the camera, reads the customer's personal
 * loyalty QR (encoded `SCANIHA:<slug>:<phone>`) and calls onScan(phone) so the
 * caisse can credit/look up without typing. Uses the native BarcodeDetector (no
 * dependency); where it's unsupported or the camera is denied, it shows a clear
 * message and the owner just types the number (the typing path is untouched).
 */
function extractPhone(raw: string): string | null {
  const v = (raw || '').trim()
  if (v.toUpperCase().startsWith('SCANIHA:')) {
    const phone = v.split(':')[2]?.trim()
    return phone && phone.replace(/\D/g, '').length >= 8 ? phone : null
  }
  const cleaned = v.replace(/^tel:/i, '').trim()
  return /^\+?[\d\s]{8,}$/.test(cleaned) ? cleaned : null
}

export default function QrScanButton({ onScan }: { onScan: (phone: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scanner le QR du client"
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" />
        </svg>
        Scanner
      </button>
      {open && <ScannerOverlay onClose={() => setOpen(false)} onScan={(p) => { onScan(p); setOpen(false) }} />}
    </>
  )
}

function ScannerOverlay({ onClose, onScan }: { onClose: () => void; onScan: (phone: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window
    let stream: MediaStream | null = null
    let timer: number | undefined
    let stopped = false

    if (!supported) {
      setError("Le scanner n'est pas disponible sur cet appareil — saisissez le numéro à la main.")
    } else {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      ;(async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
          const video = videoRef.current
          if (!video) return
          video.srcObject = stream
          await video.play()
          const loop = async () => {
            if (stopped) return
            try {
              if (video.readyState >= 2) {
                const codes = await detector.detect(video)
                for (const c of codes) {
                  const phone = extractPhone(c.rawValue || '')
                  if (phone) { onScanRef.current(phone); return }
                }
              }
            } catch {}
            timer = window.setTimeout(loop, 250)
          }
          timer = window.setTimeout(loop, 250)
        } catch {
          setError("Accès à la caméra refusé — autorisez la caméra ou saisissez le numéro à la main.")
        }
      })()
    }

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Scanner le QR du client">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">Scanner le QR du client</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-3xl border-2 border-white/80" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
        </div>
        {error && (
          <div className="absolute inset-x-5 bottom-10 rounded-2xl bg-white p-4 text-center text-sm font-medium text-zinc-700">
            {error}
            <button type="button" onClick={onClose} className="mt-3 block w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white">Fermer</button>
          </div>
        )}
      </div>
      {!error && <p className="px-4 py-4 text-center text-xs text-white/70">Visez le QR « Ma carte » du client.</p>}
    </div>
  )
}
