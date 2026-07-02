'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

const FOOD_SYMBOLS = ['🍕','🍔','🍟','🌮','🍣','🍜','🍦','🎂','🥗','🥩','🍗','🍩','🧁','🥤','☕']

interface SlotProps {
  prizes: string[]
  prizeIcons?: (string | null | undefined)[]
  prizeIsLose?: boolean[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
}

// Physics-based reel with acceleration, cruise, and deceleration snapping
function ReelColumn({ symbols, targetIdx, spinning, stopDelay, onStopped }: {
  symbols: string[]
  targetIdx: number
  spinning: boolean
  stopDelay: number
  onStopped?: () => void
}) {
  const CELL = 100
  const N = symbols.length
  const offsetRef = useRef(0)
  const [displayOffset, setDisplayOffset] = useState(0)
  const [locking, setLocking] = useState(false)
  const [locked, setLocked] = useState(false)
  const rafRef = useRef<number>(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const speedRef = useRef(0)
  const spinningRef = useRef(false)

  const stopReel = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    // Snap to exact target
    const target = targetIdx * CELL
    setLocking(true)
    setDisplayOffset(target)
    setTimeout(() => {
      setLocked(true)
      setLocking(false)
      onStopped?.()
    }, 600)
  }, [targetIdx, onStopped])

  useEffect(() => {
    if (!spinning) {
      spinningRef.current = false
      clearTimeout(stopTimerRef.current)
      cancelAnimationFrame(rafRef.current)
      setLocked(false)
      setLocking(false)
      offsetRef.current = targetIdx * CELL
      setDisplayOffset(targetIdx * CELL)
      return
    }
    spinningRef.current = true
    setLocked(false)
    setLocking(false)
    speedRef.current = 0

    const total = N * CELL
    function frame() {
      if (!spinningRef.current) return
      // Accelerate then cruise
      speedRef.current = Math.min(speedRef.current + 3, 55)
      offsetRef.current = (offsetRef.current + speedRef.current) % total
      setDisplayOffset(offsetRef.current)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    stopTimerRef.current = setTimeout(() => {
      spinningRef.current = false
      cancelAnimationFrame(rafRef.current)
      stopReel()
    }, stopDelay)

    return () => {
      spinningRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearTimeout(stopTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning])

  // Render 5 visible rows of symbols (looping)
  const visibleRows = 5
  const cells = []
  for (let i = 0; i < visibleRows; i++) {
    const rowOffset = i * CELL
    const symIdx = ((Math.floor((displayOffset + rowOffset) / CELL)) % N + N) % N
    cells.push({ sym: symbols[symIdx], key: i })
  }

  const isMoving = spinning && !locking && !locked
  const blurAmount = isMoving ? Math.min(speedRef.current / 10, 5) : 0

  return (
    <div style={{
      width: 94,
      height: CELL * 3,
      overflow: 'hidden',
      position: 'relative',
      borderRadius: 12,
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.06), inset 0 4px 20px rgba(0,0,0,0.8)',
      background: 'linear-gradient(180deg, #090916 0%, #111128 50%, #090916 100%)',
    }}>
      {/* Top / bottom shadow masks */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:60,background:'linear-gradient(180deg,rgba(0,0,0,0.92) 0%,transparent 100%)',zIndex:6,pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:60,background:'linear-gradient(0deg,rgba(0,0,0,0.92) 0%,transparent 100%)',zIndex:6,pointerEvents:'none' }} />

      {/* Spinning strip with 5 cells, each 100px, centred on row 1 (offset top: -CELL) */}
      <div style={{
        position: 'absolute',
        top: -CELL,
        left: 0, right: 0,
        filter: isMoving ? `blur(${blurAmount}px)` : 'none',
        transition: locking ? 'transform 0.55s cubic-bezier(0.22,1,0.36,1)' : 'none',
      }}>
        {cells.map(({ sym, key }) => (
          <div key={key} style={{
            height: CELL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            userSelect: 'none',
          }}>
            {sym}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SlotMachine777({ prizes, prizeIcons, prizeIsLose, spinning, targetIndex, onSpinEnd }: SlotProps) {
  const [r1done, setR1done] = useState(false)
  const [r2done, setR2done] = useState(false)
  const [r3done, setR3done] = useState(false)
  const [outcome, setOutcome] = useState<'idle'|'win'|'lose'>('idle')
  const [lightPhase, setLightPhase] = useState(0)
  const [coinCount, setCoinCount] = useState(0)
  const coinTimerRef = useRef<ReturnType<typeof setInterval>>()

  // Build display symbols: use icons from prizes or food defaults
  let symbols = prizes.map((p, i) => prizeIcons?.[i] || FOOD_SYMBOLS[i % FOOD_SYMBOLS.length])
  if (symbols.length === 0) symbols = FOOD_SYMBOLS.slice(0, 3)

  const targetIdx = targetIndex !== null ? Math.max(0, Math.min(targetIndex, symbols.length - 1)) : 0
  const isLoseOutcome = targetIndex !== null && (prizeIsLose?.[targetIndex] === true)

  useEffect(() => {
    if (!spinning) {
      setR1done(false); setR2done(false); setR3done(false)
      setOutcome('idle')
      clearInterval(coinTimerRef.current)
    }
  }, [spinning])

  useEffect(() => {
    if (r1done && r2done && r3done) {
      const oc = isLoseOutcome ? 'lose' : 'win'
      setOutcome(oc)
      if (oc === 'win') {
        let c = 0
        coinTimerRef.current = setInterval(() => {
          c++; setCoinCount(c)
          if (c >= 12) clearInterval(coinTimerRef.current)
        }, 120)
      }
      const t = setTimeout(() => onSpinEnd(), 1800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r1done, r2done, r3done])

  // Blinking border lights
  useEffect(() => {
    if (outcome === 'idle') return
    const id = setInterval(() => setLightPhase(p => p + 1), 120)
    return () => clearInterval(id)
  }, [outcome])

  const isWin = outcome === 'win'
  const isLose = outcome === 'lose'
  const NUM_LIGHTS = 14

  const borderColor = isWin ? '#FFD700' : isLose ? '#FF3333' : '#3a2a00'
  const glowColor = isWin ? '0 0 60px rgba(255,215,0,0.5), 0 0 120px rgba(255,180,0,0.25)'
    : isLose ? '0 0 40px rgba(255,50,50,0.5)' : 'none'

  return (
    <div className="select-none flex flex-col items-center w-full" style={{ fontFamily: 'Georgia, serif' }}>
      <style jsx>{`
        @keyframes slot-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.018)} }
        @keyframes lose-shake { 0%,100%{transform:translateX(0) rotate(0deg)} 15%{transform:translateX(-10px) rotate(-1deg)} 30%{transform:translateX(10px) rotate(1deg)} 45%{transform:translateX(-8px) rotate(-0.5deg)} 60%{transform:translateX(8px) rotate(0.5deg)} 75%{transform:translateX(-4px)} 90%{transform:translateX(4px)} }
        @keyframes red-pulse { 0%,100%{opacity:0} 50%{opacity:0.45} }
        @keyframes marquee { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
        @keyframes coin-pop { 0%{transform:translateY(0) scale(0.5);opacity:1} 100%{transform:translateY(-80px) scale(1.2);opacity:0} }
        @keyframes win-banner { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .slot-win-pulse { animation: slot-pulse 0.55s ease-in-out infinite; }
        .lose-shake { animation: lose-shake 0.6s ease-in-out; }
        .lose-overlay { animation: red-pulse 0.8s ease-in-out 3; }
        .marquee-wrap { overflow:hidden; white-space:nowrap; }
        .marquee-inner { display:inline-block; animation: marquee 2.2s linear infinite; }
        .win-banner-anim { animation: win-banner 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
        .coin { position:absolute; animation: coin-pop 0.9s ease-out forwards; font-size:22px; }
      `}</style>

      <div
        className={isWin ? 'slot-win-pulse' : isLose ? 'lose-shake' : ''}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(160deg, #1a0800 0%, #0d050a 55%, #180010 100%)',
          borderRadius: 32,
          border: `3px solid ${borderColor}`,
          boxShadow: `${glowColor}, 0 24px 70px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)`,
          padding: '18px 16px 22px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.35s, box-shadow 0.35s',
        }}
      >
        {/* Red flash on lose */}
        {isLose && (
          <div className="lose-overlay" style={{
            position:'absolute', inset:0, background:'rgba(255,0,0,0.28)',
            borderRadius: 30, zIndex: 30, pointerEvents:'none'
          }} />
        )}

        {/* Decorative inner frame */}
        <div style={{ position:'absolute', inset:10, border:'1.5px dashed rgba(255,215,0,0.1)', borderRadius:24, pointerEvents:'none' }} />

        {/* Coin particles on win */}
        {isWin && Array.from({length:coinCount}).map((_, i) => (
          <div key={i} className="coin" style={{
            top: '40%',
            left: `${15 + (i * 6) % 70}%`,
            animationDelay: `${i * 0.08}s`,
            zIndex: 40,
          }}>🪙</div>
        ))}

        {/* === TOP LIGHT BAR === */}
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginBottom:12, alignItems:'center' }}>
          {Array.from({length: NUM_LIGHTS}).map((_, i) => {
            const on = isWin ? (lightPhase + i) % 2 === 0 : isLose ? (lightPhase + i) % 3 === 0 : spinning ? i % 4 === 0 : false
            const col = isWin ? (i % 2 === 0 ? '#FFD700' : '#FF8C00') : isLose ? '#FF3333' : '#F47B20'
            return <div key={i} style={{
              width: 8, height: 8, borderRadius:'50%',
              background: on ? col : '#2a1800',
              boxShadow: on ? `0 0 7px ${col}, 0 0 14px ${col}55` : 'none',
              transition: 'background 0.08s, box-shadow 0.08s',
            }} />
          })}
        </div>

        {/* === TITLE BANNER === */}
        <div style={{ textAlign:'center', marginBottom:14, minHeight:38 }}>
          {isLose ? (
            <div style={{
              color:'#FF4444', fontSize:24, fontWeight:900,
              letterSpacing:'0.08em',
              textShadow:'0 0 20px rgba(255,60,60,0.9)',
            }}>😢 DÉSOLÉ !</div>
          ) : isWin ? (
            <div className="win-banner-anim" style={{
              fontSize:28, fontWeight:900, letterSpacing:'0.1em',
              background:'linear-gradient(90deg,#FFD700 0%,#FFF8DC 45%,#FF8C00 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              textShadow:'none',
            }}>🎊 JACKPOT !</div>
          ) : spinning ? (
            <div style={{
              fontSize:22, fontWeight:900, letterSpacing:'0.12em',
              background:'linear-gradient(90deg,#FF8C00,#FFD700,#FF8C00)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              animation:'slot-pulse 0.6s ease-in-out infinite',
            }}>⚡ TOURNEZ...</div>
          ) : (
            <div style={{
              fontSize:24, fontWeight:900, letterSpacing:'0.12em',
              background:'linear-gradient(90deg,#8B6914,#C9A227,#FFD700,#C9A227,#8B6914)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>⭐ LUCKY 777 ⭐</div>
          )}
        </div>

        {/* === REELS CABINET === */}
        <div style={{
          background:'#060610',
          borderRadius:18,
          padding:'16px 12px',
          border:'2px solid rgba(255,255,255,0.05)',
          boxShadow:'inset 0 0 40px rgba(0,0,0,0.95)',
          display:'flex',
          gap:10,
          justifyContent:'center',
          position:'relative',
        }}>
          {/* Payline highlight */}
          <div style={{
            position:'absolute', top:'50%', left:0, right:0, height:4,
            transform:'translateY(-50%)',
            background: isWin
              ? 'linear-gradient(90deg,transparent 5%,#FFD700 30%,#FFD700 70%,transparent 95%)'
              : isLose
              ? 'linear-gradient(90deg,transparent 5%,#FF4444 30%,#FF4444 70%,transparent 95%)'
              : 'linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.12) 30%,rgba(255,255,255,0.12) 70%,transparent 95%)',
            zIndex:10,
            boxShadow: isWin ? '0 0 15px #FFD700' : isLose ? '0 0 15px #FF4444' : 'none',
            transition:'background 0.3s, box-shadow 0.3s',
          }} />

          {/* Arrow pointers */}
          <div style={{ position:'absolute', top:'50%', left:4, transform:'translateY(-50%)', fontSize:14, color: isWin ? '#FFD700' : isLose ? '#FF4444' : 'rgba(255,255,255,0.2)', transition:'color 0.3s', zIndex:11 }}>▶</div>
          <div style={{ position:'absolute', top:'50%', right:4, transform:'translateY(-50%)', fontSize:14, color: isWin ? '#FFD700' : isLose ? '#FF4444' : 'rgba(255,255,255,0.2)', transition:'color 0.3s', zIndex:11 }}>◀</div>

          <ReelColumn symbols={symbols} targetIdx={targetIdx >= 0 ? targetIdx : 0} spinning={spinning} stopDelay={1600} onStopped={() => setR1done(true)} />
          <ReelColumn symbols={symbols} targetIdx={targetIdx >= 0 ? targetIdx : 0} spinning={spinning} stopDelay={2500} onStopped={() => setR2done(true)} />
          <ReelColumn symbols={symbols} targetIdx={targetIdx >= 0 ? targetIdx : 0} spinning={spinning} stopDelay={3500} onStopped={() => setR3done(true)} />
        </div>

        {/* === LCD DISPLAY === */}
        <div style={{
          marginTop:14,
          background:'#030a03',
          border:'2px solid #0d2a0d',
          borderRadius:9,
          padding:'9px 16px',
          textAlign:'center',
          boxShadow:'inset 0 0 20px rgba(0,100,0,0.25)',
          minHeight:38,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
        }}>
          {spinning ? (
            <div className="marquee-wrap" style={{width:'100%'}}>
              <span className="marquee-inner" style={{color:'#00ee00', fontFamily:'monospace', fontSize:13, fontWeight:700, letterSpacing:'0.05em'}}>
                ✦ BONNE CHANCE ✦ APPUYEZ SUR STOP ✦ BONNE CHANCE ✦
              </span>
            </div>
          ) : isWin ? (
            <span style={{color:'#00FF44', fontFamily:'monospace', fontSize:14, fontWeight:900, textShadow:'0 0 10px #00FF44', letterSpacing:'0.06em'}}>
              ★ VOUS AVEZ GAGNÉ ★
            </span>
          ) : isLose ? (
            <span style={{color:'#FF4444', fontFamily:'monospace', fontSize:14, fontWeight:900, letterSpacing:'0.06em'}}>
              ✗ MEILLEURE CHANCE ✗
            </span>
          ) : (
            <span style={{color:'#00cc00', fontFamily:'monospace', fontSize:13, letterSpacing:'0.05em'}}>
              ▶ INSÉREZ VOS POINTS ◀
            </span>
          )}
        </div>

        {/* === BOTTOM LIGHT BAR === */}
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:12 }}>
          {Array.from({length: NUM_LIGHTS}).map((_, i) => {
            const on = isWin ? (lightPhase + i + 1) % 2 === 0 : isLose ? (lightPhase + i + 1) % 3 === 0 : spinning ? (i+2) % 4 === 0 : false
            const col = isWin ? (i % 2 === 0 ? '#FF8C00' : '#FFD700') : isLose ? '#FF3333' : '#F47B20'
            return <div key={i} style={{
              width: 8, height: 8, borderRadius:'50%',
              background: on ? col : '#2a1800',
              boxShadow: on ? `0 0 7px ${col}, 0 0 14px ${col}55` : 'none',
              transition: 'background 0.08s, box-shadow 0.08s',
            }} />
          })}
        </div>
      </div>
    </div>
  )
}