'use client'

import { useMemo, useRef, useState } from 'react'

/* ── Scaniha brand orange — the wheel's only accent ──────────────────── */
const ORANGE = '#F47B20'
const INK = '#1B1714'
const HAIRLINE = '#ECE7DF'

/**
 * Minimal-élégant roulette wheel. Segments ALTERNATE Scaniha orange and white,
 * with thin hairline separators, a clean ring, a slim pointer and a small white
 * hub. Per-segment label colour (white on orange, ink on white) keeps contrast
 * good. No glow halo, no win flash, no heavy shadows.
 *
 * The OUTCOME comes from the server (targetIndex); the wheel only animates to it.
 * Props + spin logic are unchanged.
 */
export default function RouletteWheel({
  prizes,
  spinning,
  targetIndex,
  onSpinEnd,
  accent = ORANGE,
}: {
  prizes: string[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
  accent?: string
}) {
  // The roulette is a Scaniha feature → always the brand orange, never a
  // business colour. We keep the prop for the contract but pin the palette.
  const orange = ORANGE
  void accent

  const n = Math.max(prizes.length, 1)
  const seg = 360 / n
  const [rotation, setRotation] = useState(0)
  const [landed, setLanded] = useState(false)
  const spunRef = useRef(false)

  // Alternating orange / white segments → calm, legible wheel.
  const gradient = useMemo(() => {
    const stops: string[] = []
    for (let i = 0; i < n; i++) {
      const c = i % 2 === 0 ? orange : '#FFFFFF'
      stops.push(`${c} ${i * seg}deg ${(i + 1) * seg}deg`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [n, seg, orange])

  // Boundary geometry for the hairline separators (0° = top, clockwise).
  const marks = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = ((i * seg) * Math.PI) / 180
        return { sx: 50 + 49 * Math.sin(a), sy: 50 - 49 * Math.cos(a) }
      }),
    [n, seg]
  )

  if (spinning && targetIndex !== null && !spunRef.current) {
    spunRef.current = true
    const center = targetIndex * seg + seg / 2
    const turns = 6 * 360
    const jitter = (Math.random() - 0.5) * seg * 0.4
    setTimeout(() => {
      setLanded(false)
      setRotation(turns + (360 - center) + jitter)
    }, 30)
  }
  if (!spinning && spunRef.current) spunRef.current = false

  const SPIN_TRANSITION = 'transform 5s cubic-bezier(0.16, 0.84, 0.12, 1)'
  const idle = !spinning && !landed

  return (
    <div className="rw-stage relative mx-auto aspect-square w-full max-w-[320px] select-none">
      <style jsx>{`
        @keyframes rw-bob { 0%, 100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(-2px) } }
        .rw-pointer-idle { animation: rw-bob 2.6s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .rw-pointer-idle { animation: none !important }
        }
      `}</style>

      {/* Clean outer ring (thin hairline, very subtle shadow — no glow) */}
      <div
        className="absolute inset-0 rounded-full bg-white"
        aria-hidden="true"
        style={{ boxShadow: `inset 0 0 0 1px ${HAIRLINE}, 0 1px 2px rgba(0,0,0,0.05)` }}
      />

      {/* Slim pointer (top) — a refined teardrop in ink */}
      <div className={`absolute left-1/2 top-[-6px] z-30 -translate-x-1/2 ${idle ? 'rw-pointer-idle' : ''}`} aria-hidden="true">
        <svg width="22" height="28" viewBox="0 0 22 28">
          <path d="M11 26 L3 9 a8 8 0 0 1 16 0 Z" fill={INK} />
        </svg>
      </div>

      {/* Wheel (rotates) */}
      <div
        className="absolute inset-[10px] rounded-full"
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: rotation ? SPIN_TRANSITION : undefined,
          boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) {
            setLanded(true)
            onSpinEnd()
          }
        }}
      >
        {/* Hairline separators between segments */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {marks.map((m, i) => (
            <line key={`l${i}`} x1="50" y1="50" x2={m.sx} y2={m.sy} stroke={HAIRLINE} strokeWidth="0.5" />
          ))}
        </svg>

        {/* Labels — per-segment colour, counter-rotated to stay upright */}
        {prizes.map((label, i) => {
          const rad = (((i * seg + seg / 2) % 360) * Math.PI) / 180
          const r = 31
          const x = 50 + r * Math.sin(rad)
          const y = 50 - r * Math.cos(rad)
          const onOrange = i % 2 === 0
          return (
            <span
              key={i}
              className="absolute z-10 block w-[80px] text-center text-[12.5px] font-medium leading-tight"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                color: onOrange ? '#FFFFFF' : INK,
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                transition: rotation ? SPIN_TRANSITION : undefined,
              }}
            >
              {label}
            </span>
          )
        })}
      </div>

      {/* Centre hub — small white disc with a thin ring + orange dot */}
      <div
        className="absolute left-1/2 top-1/2 z-20 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
        style={{ boxShadow: `inset 0 0 0 1px ${HAIRLINE}, 0 1px 2px rgba(0,0,0,0.05)` }}
      >
        <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full" style={{ backgroundColor: orange }} />
      </div>
    </div>
  )
}
