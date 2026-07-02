'use client'

import { useEffect, useRef, useState } from 'react'

/* ── Default symbols used when prizes don't map to known icons ──── */
const DEFAULT_SYMBOLS = ['🍒', '🔔', '💎', '7️⃣', '⭐', '🍋', '🎰', '🍀']

const GOLD = '#F5C518'
const GOLD_DARK = '#C9A227'
const DARK_BG = '#0D0608'
const REEL_BG = '#1A0A0A'

interface SlotMachineProps {
  prizes: string[]
  prizeIcons?: (string | null | undefined)[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
}

function ReelStrip({ symbols, targetSymbol, spinning, delay, onDone }: {
  symbols: string[]
  targetSymbol: string
  spinning: boolean
  delay: number
  onDone?: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [stopped, setStopped] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ITEM_H = 80
  const VISIBLE = 3

  useEffect(() => {
    if (!spinning) { setStopped(false); return }
    setStopped(false)
    let frame = 0
    let animId: number
    const fastSpin = () => {
      frame++
      setOffset((prev) => (prev + 8) % (symbols.length * ITEM_H))
      animId = requestAnimationFrame(fastSpin)
    }
    animId = requestAnimationFrame(fastSpin)
    timerRef.current = setTimeout(() => {
      cancelAnimationFrame(animId)
      // Snap to target
      const idx = symbols.indexOf(targetSymbol)
      const snapTo = idx >= 0 ? idx * ITEM_H : 0
      setOffset(snapTo)
      setStopped(true)
      onDone?.()
    }, delay)
    return () => {
      cancelAnimationFrame(animId)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [spinning, targetSymbol, delay, symbols, onDone])

  const extSymbols = [...symbols, ...symbols, ...symbols]

  return (
    <div
      style={{
        width: 80,
        height: ITEM_H * VISIBLE,
        overflow: 'hidden',
        background: REEL_BG,
        borderRadius: 12,
        boxShadow: `inset 0 0 20px rgba(0,0,0,0.8), inset 0 0 0 2px ${GOLD}33`,
        position: 'relative',
      }}
    >
      {/* Top/bottom fade overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, background: `linear-gradient(to bottom, ${REEL_BG}, transparent)`, zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: `linear-gradient(to top, ${REEL_BG}, transparent)`, zIndex: 2 }} />
      {/* Center highlight line */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_H, transform: 'translateY(-50%)', border: `2px solid ${GOLD}88`, borderRadius: 8, zIndex: 3, background: `${GOLD}08` }} />
      <div
        style={{
          transform: `translateY(-${offset}px)`,
          transition: stopped ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)' : undefined,
        }}
      >
        {extSymbols.map((sym, i) => (
          <div
            key={i}
            style={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          >
            {sym}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SlotMachine777({ prizes, prizeIcons, spinning, targetIndex, onSpinEnd }: SlotMachineProps) {
  const [reel1Done, setReel1Done] = useState(false)
  const [reel2Done, setReel2Done] = useState(false)
  const [reel3Done, setReel3Done] = useState(false)
  const [jackpot, setJackpot] = useState(false)

  // Map prizes to symbols (use icon if available, else default symbols)
  const symbols = prizes.map((p, i) => prizeIcons?.[i] || DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length])

  const targetSymbol = targetIndex !== null ? (symbols[targetIndex] ?? symbols[0]) : symbols[0]

  // For reels 1 and 2, show random near-miss or same symbol
  const r1sym = targetSymbol
  const r2sym = targetSymbol
  const r3sym = targetSymbol

  useEffect(() => {
    if (!spinning) {
      setReel1Done(false); setReel2Done(false); setReel3Done(false); setJackpot(false)
    }
  }, [spinning])

  useEffect(() => {
    if (reel1Done && reel2Done && reel3Done) {
      setJackpot(true)
      const t = setTimeout(() => onSpinEnd(), 800)
      return () => clearTimeout(t)
    }
  }, [reel1Done, reel2Done, reel3Done, onSpinEnd])

  return (
    <div className="flex flex-col items-center select-none" style={{ gap: 0 }}>
      <style jsx>{`
        @keyframes sm-jackpot { 0%, 100% { transform: scale(1) } 25% { transform: scale(1.05) } 75% { transform: scale(0.98) } }
        @keyframes sm-glow { 0%, 100% { box-shadow: 0 0 30px 8px #F5C51844 } 50% { box-shadow: 0 0 60px 20px #F5C51888 } }
        @keyframes sm-lever { 0% { transform: rotate(0deg) } 40% { transform: rotate(60deg) } 100% { transform: rotate(0deg) } }
        .sm-jackpot-anim { animation: sm-jackpot 0.4s ease-in-out 2 }
        .sm-glow { animation: sm-glow 2s ease-in-out infinite }
        .sm-lever-pull { animation: sm-lever 0.6s ease-in-out }
      `}</style>

      {/* Machine body */}
      <div
        className={jackpot ? 'sm-glow' : ''}
        style={{
          background: `linear-gradient(160deg, #1a0505 0%, #0d0608 50%, #1a0a00 100%)`,
          borderRadius: 24,
          padding: '20px 16px',
          border: `3px solid ${GOLD_DARK}`,
          boxShadow: `0 0 0 1px ${GOLD}22, 0 8px 40px rgba(0,0,0,0.8), inset 0 1px 0 ${GOLD}33`,
          position: 'relative',
          width: '100%',
          maxWidth: 320,
        }}
      >
        {/* Top banner */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            background: `linear-gradient(90deg, ${DARK_BG}, #300000, ${DARK_BG})`,
            border: `2px solid ${GOLD}`,
            borderRadius: 10,
            padding: '6px 12px',
            display: 'inline-block',
          }}>
            <span style={{ color: GOLD, fontFamily: '"Georgia", serif', fontSize: 22, fontWeight: 'bold', letterSpacing: '0.15em', textShadow: `0 0 20px ${GOLD}` }}>
              7 7 7
            </span>
          </div>
        </div>

        {/* Reels */}
        <div
          className={jackpot ? 'sm-jackpot-anim' : ''}
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            background: '#050203',
            borderRadius: 16,
            padding: 12,
            border: `2px solid ${GOLD}44`,
            boxShadow: `inset 0 0 30px rgba(0,0,0,0.9)`,
          }}
        >
          <ReelStrip symbols={symbols.length >= 3 ? symbols : DEFAULT_SYMBOLS} targetSymbol={r1sym} spinning={spinning} delay={1800} onDone={() => setReel1Done(true)} />
          <ReelStrip symbols={symbols.length >= 3 ? symbols : DEFAULT_SYMBOLS} targetSymbol={r2sym} spinning={spinning} delay={2600} onDone={() => setReel2Done(true)} />
          <ReelStrip symbols={symbols.length >= 3 ? symbols : DEFAULT_SYMBOLS} targetSymbol={r3sym} spinning={spinning} delay={3400} onDone={() => setReel3Done(true)} />
        </div>

        {/* Jackpot lights row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10,
                borderRadius: '50%',
                background: jackpot ? GOLD : '#3A2000',
                boxShadow: jackpot ? `0 0 8px ${GOLD}` : 'none',
                transition: 'all 0.2s',
                transitionDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}