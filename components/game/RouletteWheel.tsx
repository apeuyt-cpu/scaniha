'use client'

import { useMemo, useRef, useState } from 'react'

/* ── colour helpers: build a wheel palette from one brand accent ──── */
function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let hue = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  return [hue, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * Roulette wheel themed from the café's brand accent. Segment colours are
 * derived from one hex (kept at readable mid-lightness so the white labels
 * always contrast). The OUTCOME comes from the server (targetIndex); the
 * wheel only animates to it.
 */
export default function RouletteWheel({
  prizes,
  spinning,
  targetIndex,
  onSpinEnd,
  accent = '#F47B20',
}: {
  prizes: string[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
  accent?: string
}) {
  const n = Math.max(prizes.length, 1)
  const seg = 360 / n
  const [rotation, setRotation] = useState(0)
  const spunRef = useRef(false)

  const { palette, halo, hub } = useMemo(() => {
    const [h, s] = hexToHsl(accent)
    const sat = Math.max(58, Math.min(92, s))
    return {
      palette: [
        hslToHex(h, sat, 52),
        hslToHex((h + 8) % 360, sat, 45),
        hslToHex((h + 354) % 360, sat, 56),
        hslToHex(h, sat, 48),
      ],
      halo: hslToHex(h, Math.min(64, sat), 92),
      hub: hslToHex(h, sat, 50),
    }
  }, [accent])

  const gradient = useMemo(() => {
    const stops: string[] = []
    for (let i = 0; i < n; i++) {
      const c = palette[i % palette.length]
      stops.push(`${c} ${i * seg}deg ${(i + 1) * seg}deg`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [n, seg, palette])

  if (spinning && targetIndex !== null && !spunRef.current) {
    spunRef.current = true
    const center = targetIndex * seg + seg / 2
    const turns = 5 * 360
    const jitter = (Math.random() - 0.5) * seg * 0.4
    setTimeout(() => setRotation(turns + (360 - center) + jitter), 30)
  }
  if (!spinning && spunRef.current) spunRef.current = false

  const SPIN_TRANSITION = 'transform 4.4s cubic-bezier(0.12, 0.82, 0.16, 1)'

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px] select-none">
      {/* pointer */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-4px] z-20 -translate-x-1/2 drop-shadow"
        style={{ width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderTop: '22px solid #1C1917' }}
      />
      {/* halo ring */}
      <div className="absolute inset-0 rounded-full" style={{ background: halo, boxShadow: `0 18px 45px -14px ${accent}80` }} />
      {/* wheel */}
      <div
        className="absolute inset-[10px] rounded-full ring-1 ring-black/5"
        style={{ background: gradient, transform: `rotate(${rotation}deg)`, transition: rotation ? SPIN_TRANSITION : undefined }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) onSpinEnd()
        }}
      >
        {prizes.map((label, i) => {
          const rad = (((i * seg + seg / 2) % 360) * Math.PI) / 180
          const r = 31
          const x = 50 + r * Math.sin(rad)
          const y = 50 - r * Math.cos(rad)
          return (
            <span
              key={i}
              className="absolute z-10 block w-[88px] text-center text-[13px] font-bold leading-tight text-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                transition: rotation ? SPIN_TRANSITION : undefined,
                textShadow: '0 1px 2px rgba(0,0,0,0.28)',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>
      {/* hub */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill={hub} aria-hidden="true">
          <path d="M7 2c.41 0 .75.34.75.75V7c0 .55.45 1 1 1s1-.45 1-1V2.75a.75.75 0 0 1 1.5 0V7c0 1.4-.82 2.6-2 3.16V21a1.25 1.25 0 1 1-2.5 0V10.16A3.49 3.49 0 0 1 4.75 7V2.75a.75.75 0 0 1 1.5 0V7c0 .55.45 1 1 1V2.75c0-.41.34-.75.75-.75Zm9.5 0c1.8 0 3.25 2.02 3.25 4.5 0 2.08-1.02 3.83-2.4 4.35V21a1.25 1.25 0 1 1-2.5 0v-9.91c-.86-.7-1.6-2.08-1.6-4.59C13.25 4.02 14.7 2 16.5 2Z" />
        </svg>
      </div>
    </div>
  )
}
