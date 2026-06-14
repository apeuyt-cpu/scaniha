'use client'

import { useEffect, useState } from 'react'

const FALLBACK = ['#F47B20', '#F5B82E', '#22c55e', '#3b82f6', '#ec4899']

/** One-shot confetti burst — mounts on a win, removes itself after ~2s. */
export default function Confetti({ accent = '#F47B20', count = 38 }: { accent?: string; count?: number }) {
  const [show, setShow] = useState(true)
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.1 + Math.random() * 0.8,
      rot: Math.random() * 360,
      size: 6 + Math.random() * 7,
      color: i % 3 === 0 ? accent : FALLBACK[i % FALLBACK.length],
      round: Math.random() > 0.5,
    }))
  )

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2100)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>{`@keyframes confetti-fall{0%{transform:translateY(-12vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
          }}
        />
      ))}
    </div>
  )
}
