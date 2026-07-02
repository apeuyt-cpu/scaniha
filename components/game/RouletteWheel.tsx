'use client'

import { useMemo, useRef, useState } from 'react'

/* ── Premium casino palette ─────────────────────────────────────────────── */
const GOLD = '#F5C518'
const GOLD_DARK = '#C9A227'
const DEEP_RED = '#8B0000'
const CRIMSON = '#DC143C'
const DARK_BG = '#1A0A0A'

const SEGMENT_COLORS = [
  { bg: '#8B0000', text: '#F5C518' },
  { bg: '#1A0A0A', text: '#F5C518' },
  { bg: '#6B0000', text: '#FFFFFF' },
  { bg: '#2C1A00', text: '#F5C518' },
  { bg: '#4A0000', text: '#FFFFFF' },
  { bg: '#0D0D0D', text: '#F5C518' },
  { bg: '#7A0000', text: '#FFFFFF' },
  { bg: '#1A1A00', text: '#F5C518' },
]

export default function RouletteWheel({
  prizes,
  spinning,
  targetIndex,
  onSpinEnd,
  accent = GOLD,
  prizeIcons,
}: {
  prizes: string[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
  accent?: string
  prizeIcons?: (string | null | undefined)[]
}) {
  void accent
  const n = Math.max(prizes.length, 1)
  const seg = 360 / n
  const [rotation, setRotation] = useState(0)
  const [landed, setLanded] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const spunRef = useRef(false)
  const reducedMotionRef = useRef(false)

  const gradient = useMemo(() => {
    const stops: string[] = []
    for (let i = 0; i < n; i++) {
      const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length].bg
      stops.push(`${c} ${i * seg}deg ${(i + 1) * seg}deg`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [n, seg])

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
    setIsSpinning(true)
    const center = targetIndex * seg + seg / 2
    const turns = 7 * 360
    const jitter = (Math.random() - 0.5) * seg * 0.35
    const rest = (((360 - center + jitter) % 360) + 360) % 360
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedMotionRef.current = prefersReducedMotion
    if (prefersReducedMotion) {
      setTimeout(() => {
        setRotation(rest); setLanded(true); setIsSpinning(false); onSpinEnd()
      }, 30)
    } else {
      setTimeout(() => {
        setLanded(false)
        setRotation((current) => {
          const forwardDelta = (((rest - current) % 360) + 360) % 360
          return current + forwardDelta + turns
        })
      }, 30)
    }
  }
  if (!spinning && spunRef.current) { spunRef.current = false; setIsSpinning(false) }

  const SPIN_TRANSITION = 'transform 6s cubic-bezier(0.08, 0.92, 0.12, 1)'
  const idle = !spinning && !landed

  return (
    <div className="rw-stage relative mx-auto aspect-square w-full max-w-[340px] select-none" role="img" aria-label="Roulette de casino">
      <style jsx>{`
        @keyframes rw-bob {
          0%, 100% { transform: translateX(-50%) translateY(0) }
          50% { transform: translateX(-50%) translateY(-3px) }
        }
        @keyframes rw-hub-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 3px #1A0A0A, 0 0 0 6px #F5C51899, 0 0 25px 6px #F5C51866 }
          50% { transform: translate(-50%, -50%) scale(1.07); box-shadow: 0 0 0 3px #1A0A0A, 0 0 0 7px #F5C518cc, 0 0 35px 10px #F5C51899 }
        }
        @keyframes rw-diamond {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) rotate(45deg) scale(1) }
          50% { opacity: 0.6; transform: translate(-50%, -50%) rotate(45deg) scale(0.85) }
        }
        @keyframes rw-border-rot {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }
        .rw-pointer-idle { animation: rw-bob 2.4s ease-in-out infinite }
        .rw-hub { animation: rw-hub-pulse 2s ease-in-out infinite }
        .rw-diamond-anim { animation: rw-diamond 1.8s ease-in-out infinite }
        .rw-border-rot { animation: rw-border-rot 10s linear infinite }
        @media (prefers-reduced-motion: reduce) {
          .rw-pointer-idle, .rw-hub, .rw-diamond-anim, .rw-border-rot { animation: none !important }
        }
      `}</style>

      {/* Rotating gold/crimson outer ring */}
      <div
        className="rw-border-rot absolute inset-0 rounded-full"
        aria-hidden="true"
        style={{
          background: `conic-gradient(from 0deg, ${GOLD}, ${GOLD_DARK}, ${CRIMSON}, ${GOLD_DARK}, ${GOLD}, ${DEEP_RED}, ${GOLD})`,
          padding: '5px',
        }}
      >
        <div className="h-full w-full rounded-full" style={{ background: DARK_BG }} />
      </div>

      {/* Inner static ring separator */}
      <div
        className="absolute rounded-full"
        aria-hidden="true"
        style={{
          inset: '5px',
          boxShadow: `inset 0 0 0 2px ${GOLD}44`,
          borderRadius: '50%',
        }}
      />

      {/* Diamond studs around the border */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const r = 47.5
        const cx = 50 + r * Math.sin(a)
        const cy = 50 - r * Math.cos(a)
        return (
          <div
            key={`stud-${i}`}
            className="rw-diamond-anim absolute"
            aria-hidden="true"
            style={{
              left: `${cx}%`,
              top: `${cy}%`,
              width: 8,
              height: 8,
              background: GOLD,
              boxShadow: `0 0 8px 2px ${GOLD}cc`,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              zIndex: 26,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        )
      })}

      {/* Gold pointer (top) */}
      <div
        className={`absolute left-1/2 top-[-4px] z-30 -translate-x-1/2 ${idle ? 'rw-pointer-idle' : ''}`}
        aria-hidden="true"
      >
        <svg width="30" height="40" viewBox="0 0 30 40">
          <defs>
            <linearGradient id="ptr-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={GOLD_DARK} />
              <stop offset="40%" stopColor="#FFE066" />
              <stop offset="100%" stopColor={GOLD_DARK} />
            </linearGradient>
            <filter id="ptr-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.7" />
            </filter>
          </defs>
          <path d="M15 38 L1 11 a14 14 0 0 1 28 0 Z" fill="url(#ptr-g)" filter="url(#ptr-shadow)" />
          <path d="M15 33 L6 14 a9 9 0 0 1 18 0 Z" fill="#FFE566" opacity="0.25" />
          <circle cx="15" cy="8" r="4.5" fill={GOLD} />
        </svg>
      </div>

      {/* The spinning wheel */}
      <div
        className="absolute overflow-hidden rounded-full"
        style={{
          inset: '11px',
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: rotation && !reducedMotionRef.current ? SPIN_TRANSITION : undefined,
          boxShadow: `inset 0 0 0 2px ${GOLD}55, inset 0 0 50px rgba(0,0,0,0.65)`,
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) {
            setLanded(true)
            setIsSpinning(false)
            onSpinEnd()
          }
        }}
      >
        {/* Gold separator lines */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {marks.map((m, i) => (
            <line key={`l${i}`} x1="50" y1="50" x2={m.sx} y2={m.sy} stroke={GOLD} strokeWidth="0.8" opacity="0.75" />
          ))}
          <circle cx="50" cy="50" r="49" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
        </svg>

        {/* Prize labels + icons */}
        {prizes.map((label, i) => {
          const rad = (((i * seg + seg / 2) % 360) * Math.PI) / 180
          const r = n <= 4 ? 27 : 30
          const x = 50 + r * Math.sin(rad)
          const y = 50 - r * Math.cos(rad)
          const col = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
          const icon = prizeIcons?.[i]
          const isGold = col.text === GOLD
          return (
            <span
              key={i}
              className="absolute z-10 flex flex-col items-center justify-center"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: '82px',
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                transition: rotation && !reducedMotionRef.current ? SPIN_TRANSITION : undefined,
              }}
            >
              {icon && (
                <span
                  className="block text-center leading-none"
                  style={{ fontSize: n <= 5 ? '16px' : n <= 8 ? '13px' : '10px', marginBottom: '1px' }}
                >
                  {icon}
                </span>
              )}
              <span
                className="block text-center font-bold leading-tight"
                style={{
                  color: col.text,
                  fontSize: n <= 4 ? '12px' : n <= 6 ? '11px' : '9.5px',
                  maxWidth: '72px',
                  wordBreak: 'break-word',
                  textShadow: isGold
                    ? `0 0 12px ${GOLD}bb, 0 1px 3px rgba(0,0,0,0.9)`
                    : '0 1px 4px rgba(0,0,0,0.95)',
                  fontFamily: '"Georgia", serif',
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </span>
            </span>
          )
        })}
      </div>

      {/* Gold hub center */}
      <div
        className="rw-hub absolute left-1/2 top-1/2 z-20 flex items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          background: `radial-gradient(circle at 35% 30%, #FFE566, ${GOLD} 45%, ${GOLD_DARK} 70%, #7A5800)`,
        }}
      >
        <span style={{ fontSize: 26, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🎰</span>
      </div>
    </div>
  )
}