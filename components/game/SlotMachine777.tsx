'use client'

import { useEffect, useState, useRef } from 'react'

const DEFAULT_SYMBOLS = ['💎', '👑', '🎰', '7️⃣', '🍒', '🎯', '🌟', '🔔', '🍋', '🎪']

interface SlotProps {
  prizes: string[]
  prizeIcons?: (string | null | undefined)[]
  prizeIsLose?: boolean[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
}

function ReelColumn({ symbols, target, spinning, stopDelay, onStopped }: {
  symbols: string[]
  target: string
  spinning: boolean
  stopDelay: number
  onStopped?: () => void
}) {
  const CELL = 110
  const N = symbols.length || 1
  const [pos, setPos] = useState(0)
  const [locked, setLocked] = useState(false)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const speedRef = useRef(0)

  useEffect(() => {
    if (!spinning) { setLocked(false); return }
    setLocked(false)
    speedRef.current = 0
    let p = pos
    const total = N * CELL

    function frame() {
      speedRef.current = Math.min(speedRef.current + 4, 60)
      p = (p + speedRef.current) % total
      setPos(p)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    timerRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current)
      const idx = symbols.indexOf(target)
      const snap = (idx >= 0 ? idx : 0) * CELL
      setPos(snap)
      setLocked(true)
      onStopped?.()
    }, stopDelay)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning])

  const repeated = [...symbols, ...symbols, ...symbols, ...symbols]

  return (
    <div style={{
      width: 88, height: CELL * 3, overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(180deg, #0a0a14 0%, #121226 100%)',
      borderRadius: 10,
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), inset 0 0 0 1.5px rgba(255,255,255,0.07)',
    }}>
      {/* Cylinder shading */}
      <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 25%, rgba(255,255,255,0.04) 50%, transparent 75%, rgba(0,0,0,0.9) 100%)'
      }} />
      {/* Reel strip */}
      <div style={{
        transform: `translateY(-${pos + CELL}px)`,
        transition: locked ? 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        willChange: 'transform',
      }}>
        {repeated.map((sym, i) => (
          <div key={i} style={{
            height: CELL, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: 52, lineHeight:1,
            filter: spinning && !locked ? 'blur(3px) brightness(0.7)' : 'none',
            transition: locked ? 'filter 0.3s' : 'none',
          }}>{sym}</div>
        ))}
      </div>
    </div>
  )
}

export default function SlotMachine777({ prizes, prizeIcons, prizeIsLose, spinning, targetIndex, onSpinEnd }: SlotProps) {
  const [r1, setR1] = useState(false)
  const [r2, setR2] = useState(false)
  const [r3, setR3] = useState(false)
  const [outcome, setOutcome] = useState<'idle'|'win'|'lose'>('idle')
  const [lightPhase, setLightPhase] = useState(0)

  let symbols = prizes.map((p, i) => prizeIcons?.[i] || DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length])
  if (symbols.length < 3) symbols = [...DEFAULT_SYMBOLS].slice(0, 8)

  const targetSym = targetIndex !== null ? (symbols[targetIndex] ?? symbols[0]) : symbols[0]
  const isLoseOutcome = targetIndex !== null && (prizeIsLose?.[targetIndex] === true)

  useEffect(() => {
    if (!spinning) { setR1(false); setR2(false); setR3(false); setOutcome('idle') }
  }, [spinning])

  useEffect(() => {
    if (r1 && r2 && r3) {
      setOutcome(isLoseOutcome ? 'lose' : 'win')
      const t = setTimeout(() => onSpinEnd(), 1200)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r1, r2, r3])

  // Blinking lights
  useEffect(() => {
    if (outcome !== 'win') return
    const id = setInterval(() => setLightPhase(p => p + 1), 150)
    return () => clearInterval(id)
  }, [outcome])

  const NUM_LIGHTS = 16
  const isWin = outcome === 'win'
  const isLose = outcome === 'lose'
  const borderColor = isWin ? '#FFD700' : isLose ? '#FF3333' : '#5a3a00'
  const glowColor = isWin ? 'rgba(255,215,0,0.6)' : isLose ? 'rgba(255,50,50,0.5)' : 'rgba(0,0,0,0)'

  return (
    <div className="select-none flex flex-col items-center w-full" style={{ fontFamily: 'Georgia, serif' }}>
      <style jsx>{`
        @keyframes jackpot-pulse { 0%,100%{transform:scale(1)} 40%{transform:scale(1.025)} }
        @keyframes lose-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes lose-flash { 0%{opacity:0} 30%{opacity:0.7} 100%{opacity:0} }
        @keyframes marquee-txt { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
        .jackpot-anim { animation: jackpot-pulse 0.6s ease-in-out infinite; }
        .lose-shake-anim { animation: lose-shake 0.5s ease-in-out; }
        .lose-overlay { animation: lose-flash 1.5s ease-out forwards; }
        .marquee { overflow:hidden; white-space:nowrap; }
        .marquee span { display:inline-block; animation: marquee-txt 2s linear infinite; }
      `}</style>

      {/* Machine body */}
      <div
        className={isWin ? 'jackpot-anim' : isLose ? 'lose-shake-anim' : ''}
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'linear-gradient(160deg, #1c0a00 0%, #0d0608 60%, #1a0505 100%)',
          borderRadius: 28,
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${glowColor}`,
          padding: '20px 16px 24px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.4s, box-shadow 0.4s',
        }}
      >
        {/* Lose flash overlay */}
        {isLose && (
          <div className="lose-overlay" style={{
            position:'absolute', inset:0, background:'rgba(255,0,0,0.3)', borderRadius:25, zIndex:20, pointerEvents:'none'
          }} />
        )}

        {/* Decorative border dots */}
        <div style={{ position:'absolute', inset:8, border:'1.5px dashed rgba(255,215,0,0.15)', borderRadius:22, pointerEvents:'none' }} />

        {/* Top lights row */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:14 }}>
          {Array.from({length: NUM_LIGHTS}).map((_, i) => {
            const on = isWin ? (lightPhase + i) % 3 === 0 : isLose ? true : false
            const col = isWin ? '#FFD700' : isLose ? '#FF4444' : '#2a1500'
            return <div key={i} style={{
              width:9, height:9, borderRadius:'50%',
              background: on ? col : '#2a1500',
              boxShadow: on ? `0 0 8px ${col}` : 'none',
              transition:'background 0.1s, box-shadow 0.1s'
            }} />
          })}
        </div>

        {/* Banner */}
        <div style={{ textAlign:'center', marginBottom:16 }}>
          {isLose ? (
            <div style={{ color:'#FF4444', fontSize:22, fontWeight:900, letterSpacing:'0.1em', textShadow:'0 0 15px rgba(255,0,0,0.7)' }}>😢 DÉSOLÉ !</div>
          ) : (
            <div style={{
              background: isWin
                ? 'linear-gradient(90deg,#FFD700,#FFF8DC,#FFD700)'
                : 'linear-gradient(90deg,#8B6914,#C9A227,#8B6914)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              fontSize:26, fontWeight:900, letterSpacing:'0.12em',
            }}>
              {isWin ? '🎊 JACKPOT !' : '⭐ LUCKY 777'}
            </div>
          )}
        </div>

        {/* Reels */}
        <div style={{
          background:'#080810', borderRadius:16, padding:'14px 10px',
          border:'2px solid rgba(255,255,255,0.07)',
          boxShadow:'inset 0 0 30px rgba(0,0,0,1)',
          display:'flex', gap:10, justifyContent:'center',
          position:'relative',
        }}>
          {/* Payline */}
          <div style={{
            position:'absolute', top:'50%', left:0, right:0, height:3,
            transform:'translateY(-50%)',
            background: isWin ? 'linear-gradient(90deg,transparent,#FFD700,transparent)'
              : isLose ? 'linear-gradient(90deg,transparent,#FF4444,transparent)'
              : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',
            zIndex:10,
          }} />
          {/* Payline arrows */}
          <div style={{ position:'absolute', top:'50%', left:-12, transform:'translateY(-50%)', width:0, height:0, borderTop:'9px solid transparent', borderBottom:'9px solid transparent', borderLeft:`12px solid ${isWin ? '#FFD700' : isLose ? '#FF4444' : 'rgba(255,255,255,0.2)'}`, zIndex:11 }} />
          <div style={{ position:'absolute', top:'50%', right:-12, transform:'translateY(-50%)', width:0, height:0, borderTop:'9px solid transparent', borderBottom:'9px solid transparent', borderRight:`12px solid ${isWin ? '#FFD700' : isLose ? '#FF4444' : 'rgba(255,255,255,0.2)'}`, zIndex:11 }} />

          <ReelColumn symbols={symbols} target={targetSym} spinning={spinning} stopDelay={1800} onStopped={() => setR1(true)} />
          <ReelColumn symbols={symbols} target={targetSym} spinning={spinning} stopDelay={2800} onStopped={() => setR2(true)} />
          <ReelColumn symbols={symbols} target={targetSym} spinning={spinning} stopDelay={3800} onStopped={() => setR3(true)} />
        </div>

        {/* Bottom LCD display */}
        <div style={{
          marginTop:16, background:'#050f05', border:'2px solid #1a3a1a',
          borderRadius:8, padding:'8px 14px', textAlign:'center',
          boxShadow:'inset 0 0 15px rgba(0,100,0,0.3)',
        }}>
          {spinning ? (
            <div className="marquee">
              <span style={{ color:'#00dd00', fontFamily:'monospace', fontSize:13, fontWeight:'bold' }}>
                ✦ BONNE CHANCE ✦ BONNE CHANCE ✦ BONNE CHANCE ✦
              </span>
            </div>
          ) : isWin ? (
            <span style={{ color:'#00FF00', fontFamily:'monospace', fontSize:14, fontWeight:'bold', textShadow:'0 0 8px #00FF00' }}>★ VOUS AVEZ GAGNÉ ★</span>
          ) : isLose ? (
            <span style={{ color:'#FF4444', fontFamily:'monospace', fontSize:14, fontWeight:'bold' }}>✗ PAS DE CHANCE ✗</span>
          ) : (
            <span style={{ color:'#00cc00', fontFamily:'monospace', fontSize:13 }}>▶ INSÉREZ POINTS ◀</span>
          )}
        </div>

        {/* Bottom lights row */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:14 }}>
          {Array.from({length: NUM_LIGHTS}).map((_, i) => {
            const on = isWin ? (lightPhase + i + 2) % 3 === 0 : isLose ? true : false
            const col = isWin ? '#FFD700' : isLose ? '#FF4444' : '#2a1500'
            return <div key={i} style={{
              width:9, height:9, borderRadius:'50%',
              background: on ? col : '#2a1500',
              boxShadow: on ? `0 0 8px ${col}` : 'none',
              transition:'background 0.1s, box-shadow 0.1s'
            }} />
          })}
        </div>
      </div>
    </div>
  )
}