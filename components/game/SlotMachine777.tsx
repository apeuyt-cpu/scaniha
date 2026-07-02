'use client'

import { useEffect, useState } from 'react'

const DEFAULT_SYMBOLS = ['💎', '👑', '🎰', '7️⃣', '🍒', '🎯', '🌟', '🔔']

interface SlotMachineProps {
  prizes: string[]
  prizeIcons?: (string | null | undefined)[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
}

function Reel({ symbols, targetSymbol, spinning, delay, onDone }: { symbols: string[], targetSymbol: string, spinning: boolean, delay: number, onDone?: () => void }) {
  const [offset, setOffset] = useState(0)
  const [stopped, setStopped] = useState(true)
  const ITEM_H = 100
  const VISIBLE = 3

  useEffect(() => {
    if (!spinning) { setStopped(true); return }
    setStopped(false)
    let startTime = performance.now()
    let animId: number
    
    // We create an infinite loop array by duplicating symbols
    const totalHeight = symbols.length * ITEM_H
    
    const spin = (time: number) => {
      const elapsed = time - startTime
      if (elapsed > delay) {
        // Snap to target
        const idx = symbols.indexOf(targetSymbol)
        const snapOffset = (idx >= 0 ? idx : 0) * ITEM_H
        setOffset(snapOffset)
        setStopped(true)
        onDone?.()
        return
      }
      
      // Fast spin
      setOffset(prev => (prev + 35) % totalHeight)
      animId = requestAnimationFrame(spin)
    }
    animId = requestAnimationFrame(spin)
    
    return () => cancelAnimationFrame(animId)
  }, [spinning, targetSymbol, delay, symbols, onDone])

  // Quadruple symbols to ensure smooth wrapping visually when translating
  const extSymbols = [...symbols, ...symbols, ...symbols, ...symbols]

  return (
    <div style={{
      width: 90,
      height: ITEM_H * VISIBLE,
      position: 'relative',
      background: '#F9F9F9',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: 'inset 0 15px 25px rgba(0,0,0,0.6), inset 0 -15px 25px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.8)',
    }}>
      {/* 3D Cylinder shading overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.05) 70%, rgba(0,0,0,0.85) 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        // Align the target symbol to the middle of the 3 visible items
        transform: `translateY(-${offset + ITEM_H}px)`,
        // The bounce-back effect (cubic-bezier) when stopped
        transition: stopped ? 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
        willChange: 'transform'
      }}>
        {extSymbols.map((sym, i) => (
          <div key={i} style={{
            height: ITEM_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
            filter: !stopped ? 'blur(1px)' : 'none',
            textShadow: '0 4px 6px rgba(0,0,0,0.2)'
          }}>
            {sym}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SlotMachine777({ prizes, prizeIcons, spinning, targetIndex, onSpinEnd }: SlotMachineProps) {
  const [r1Done, setR1] = useState(false)
  const [r2Done, setR2] = useState(false)
  const [r3Done, setR3] = useState(false)
  const [jackpot, setJackpot] = useState(false)

  // Map prizes to symbols (use icon if available, else default symbols)
  let symbols = prizes.map((p, i) => prizeIcons?.[i] || DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length])
  if (symbols.length < 3) symbols = [...symbols, ...DEFAULT_SYMBOLS].slice(0, 5)

  const targetSymbol = targetIndex !== null ? (symbols[targetIndex] ?? symbols[0]) : symbols[0]

  useEffect(() => {
    if (!spinning) { setR1(false); setR2(false); setR3(false); setJackpot(false) }
  }, [spinning])

  useEffect(() => {
    if (r1Done && r2Done && r3Done) {
      setJackpot(true)
      const t = setTimeout(() => onSpinEnd(), 1000)
      return () => clearTimeout(t)
    }
  }, [r1Done, r2Done, r3Done, onSpinEnd])

  return (
    <div className="flex flex-col items-center select-none w-full max-w-sm mx-auto">
      <style jsx>{`
        @keyframes sm-jackpot { 0%, 100% { transform: scale(1); box-shadow: 0 0 30px #FFD700; } 50% { transform: scale(1.02); box-shadow: 0 0 60px #FFD700, 0 0 100px #FF8C00; } }
        @keyframes sm-light { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes marquee { 0% { background-position: 0 0; } 100% { background-position: -40px 0; } }
        .jackpot-anim { animation: sm-jackpot 0.8s ease-in-out infinite; }
      `}</style>

      {/* Main Machine Body - Professional Metallic & Casino theme */}
      <div
        className={jackpot ? 'jackpot-anim' : ''}
        style={{
          background: `linear-gradient(145deg, #2b0404 0%, #1a0202 50%, #3d0505 100%)`,
          borderRadius: 28,
          padding: '24px 20px',
          border: '4px solid #B8860B',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 2px 2px rgba(255,255,255,0.2), inset 0 -4px 10px rgba(0,0,0,0.6)',
          position: 'relative',
          width: '100%',
        }}
      >
        {/* Lights Border */}
        <div style={{
          position: 'absolute', inset: 8, border: '2px dotted #FFD700', borderRadius: 20, opacity: 0.5, pointerEvents: 'none'
        }} />

        {/* Top Casino Banner */}
        <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'linear-gradient(180deg, #FFD700 0%, #DAA520 40%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: '"Georgia", serif',
            fontSize: '32px',
            fontWeight: '900',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}>
            LUCKY 777
          </div>
          {jackpot && (
            <div style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginTop: 4, textShadow: '0 0 10px #FFD700' }}>
              JACKPOT WINNER!
            </div>
          )}
        </div>

        {/* Reels Container */}
        <div style={{
          position: 'relative',
          background: '#0a0a0a',
          borderRadius: 12,
          padding: '16px 12px',
          border: '3px solid #666',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,1)',
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          zIndex: 2
        }}>
          {/* Winning Line Glow */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, height: 4, background: 'rgba(255, 0, 0, 0.7)',
            transform: 'translateY(-50%)', zIndex: 11, boxShadow: '0 0 15px 4px rgba(255,0,0,0.5)'
          }} />

          {/* Triangles for the winning line */}
          <div style={{ position: 'absolute', top: '50%', left: -10, transform: 'translateY(-50%)', borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '12px solid #FF0000', zIndex: 12 }} />
          <div style={{ position: 'absolute', top: '50%', right: -10, transform: 'translateY(-50%)', borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '12px solid #FF0000', zIndex: 12 }} />

          <Reel symbols={symbols} targetSymbol={targetSymbol} spinning={spinning} delay={2000} onDone={() => setR1(true)} />
          <Reel symbols={symbols} targetSymbol={targetSymbol} spinning={spinning} delay={3000} onDone={() => setR2(true)} />
          <Reel symbols={symbols} targetSymbol={targetSymbol} spinning={spinning} delay={4000} onDone={() => setR3(true)} />
        </div>

        {/* Bottom Decorative Panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '0 10px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%', background: jackpot ? '#00FF00' : '#FF0000',
                boxShadow: `0 0 10px ${jackpot ? '#00FF00' : '#FF0000'}`, animation: spinning ? `sm-light 0.5s infinite ${i * 0.1}s` : 'none'
              }} />
            ))}
          </div>
          <div style={{
            background: '#111', border: '2px solid #444', borderRadius: 6, padding: '4px 16px', color: '#0f0', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', boxShadow: 'inset 0 0 10px rgba(0,255,0,0.2)'
          }}>
            {spinning ? 'SPINNING...' : (jackpot ? 'WINNER !!!' : 'INSERT COIN')}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%', background: jackpot ? '#00FF00' : '#FF0000',
                boxShadow: `0 0 10px ${jackpot ? '#00FF00' : '#FF0000'}`, animation: spinning ? `sm-light 0.5s infinite ${i * 0.1}s` : 'none'
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}