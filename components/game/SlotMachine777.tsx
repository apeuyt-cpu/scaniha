'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* ── Constants ─────────────────────────────────────────────────────────────── */
const CELL = 88          // px per symbol cell
const ROWS = 3           // visible rows per reel (top / payline / bottom)
const REEL_H = CELL * ROWS   // 264px viewport
const REPEATS = 8        // full cycles in strip for smooth animation

const FALLBACK = ['🍕','🎁','🌮','☕','🍔','⭐','🎯','💎']

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface SlotProps {
  prizes: string[]
  prizeIcons?: (string | null | undefined)[]
  prizeIsLose?: boolean[]
  spinning: boolean
  targetIndex: number | null
  onSpinEnd: () => void
}

/* ── Strip helpers ─────────────────────────────────────────────────────────── */

/** Build a long repeating strip of symbols */
function makeStrip(syms: string[]): string[] {
  const s: string[] = []
  for (let r = 0; r < REPEATS; r++) for (const x of syms) s.push(x)
  return s
}

/**
 * Find a scroll offset (px) so that symbols[symIdx] lands in the MIDDLE row.
 *
 * When the strip is translated by -offset px:
 *   • Top row    shows strip[ floor(offset/CELL) ]
 *   • Middle row shows strip[ floor(offset/CELL) + 1 ]
 *   • Bottom row shows strip[ floor(offset/CELL) + 2 ]
 *
 * We want middle = symbols[symIdx]  =>  strip index = k*N + symIdx for some k
 *   topIdx = k*N + symIdx - 1
 *   offset = topIdx * CELL
 */
function calcStop(symIdx: number, N: number, minPx = 1800): number {
  for (let k = 2; k < REPEATS; k++) {
    const topIdx = k * N + symIdx - 1
    const px = topIdx * CELL
    if (px >= minPx) return px
  }
  return ((REPEATS - 1) * N + symIdx - 1) * CELL
}

/* ── Single Reel ───────────────────────────────────────────────────────────── */
function Reel({
  strip, N, symIdx, spinning, stopDelay, blurring, onStopped,
}: {
  strip: string[]
  N: number
  symIdx: number
  spinning: boolean
  stopDelay: number
  blurring: boolean
  onStopped?: () => void
}) {
  const totalH = strip.length * CELL

  const [offset, setOffset] = useState(0)
  const [snapping, setSnapping] = useState(false)

  const offsetRef = useRef(0)
  const speedRef = useRef(0)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const aliveRef = useRef(false)

  const doStop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    // Ensure we overshoot enough to look like a real deceleration
    const target = calcStop(symIdx, N, offsetRef.current + 400)
    setSnapping(true)
    setOffset(target % totalH)
    offsetRef.current = target % totalH
    setTimeout(() => {
      setSnapping(false)
      onStopped?.()
    }, 600)
  }, [symIdx, N, totalH, onStopped])

  useEffect(() => {
    if (!spinning) {
      aliveRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
      setSnapping(false)
      setOffset(0)
      offsetRef.current = 0
      speedRef.current = 0
      return
    }

    aliveRef.current = true
    speedRef.current = 0

    function tick() {
      if (!aliveRef.current) return
      speedRef.current = Math.min(speedRef.current + 4, 62)
      offsetRef.current = (offsetRef.current + speedRef.current) % totalH
      setOffset(offsetRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    timerRef.current = setTimeout(() => {
      aliveRef.current = false
      cancelAnimationFrame(rafRef.current)
      doStop()
    }, stopDelay)

    return () => {
      aliveRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning])

  // Render extended strip (add ROWS extra at end to avoid empty viewport)
  const extended = [...strip, ...strip.slice(0, ROWS + 2)]

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      height: REEL_H,
      flex: 1,
      background: 'linear-gradient(180deg, #080810 0%, #0e0e1a 50%, #080810 100%)',
    }}>
      {/* Top fade mask */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 55,
        background: 'linear-gradient(180deg, rgba(5,5,12,0.97) 0%, transparent 100%)',
        zIndex: 4, pointerEvents: 'none',
      }} />
      {/* Bottom fade mask */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 55,
        background: 'linear-gradient(0deg, rgba(5,5,12,0.97) 0%, transparent 100%)',
        zIndex: 4, pointerEvents: 'none',
      }} />

      {/* Scrolling strip */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, top: 0,
        transform: `translateY(-${offset % totalH}px)`,
        transition: snapping ? 'transform 0.58s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        willChange: 'transform',
        filter: (blurring && !snapping) ? 'blur(3px)' : 'none',
      }}>
        {extended.map((sym, i) => (
          <div key={i} style={{
            height: CELL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            userSelect: 'none',
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 10px rgba(255,200,50,0.2))',
          }}>
            {sym}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Machine ──────────────────────────────────────────────────────────── */
export default function SlotMachine777({
  prizes, prizeIcons, prizeIsLose, spinning, targetIndex, onSpinEnd,
}: SlotProps) {
  const [r1, setR1] = useState(false)
  const [r2, setR2] = useState(false)
  const [r3, setR3] = useState(false)
  const [outcome, setOutcome] = useState<'idle'|'win'|'lose'>('idle')
  const [lights, setLights] = useState(0)
  const [blurReels, setBlurReels] = useState(false)
  const lightsRef = useRef<ReturnType<typeof setInterval>>()
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>()

  /* Build symbols */
  let symbols = prizes.map((_, i) => prizeIcons?.[i] || FALLBACK[i % FALLBACK.length])
  if (symbols.length === 0) symbols = FALLBACK.slice(0, 4)
  const N = symbols.length

  const safeIdx = targetIndex !== null
    ? Math.max(0, Math.min(targetIndex, N - 1)) : 0
  const isLosePrize = targetIndex !== null && Boolean(prizeIsLose?.[safeIdx])

  /*
   * For a WIN: all 3 reels stop with the same symbol (safeIdx) in the middle.
   * For a LOSE: 3 DIFFERENT symbols in the middle (looks like a near-miss).
   */
  const r1Sym = safeIdx
  const r2Sym = isLosePrize ? (safeIdx + 1) % N : safeIdx
  const r3Sym = isLosePrize ? (safeIdx + 2) % N : safeIdx

  const strip = makeStrip(symbols)

  /* Reset on new spin */
  useEffect(() => {
    if (!spinning) {
      setR1(false); setR2(false); setR3(false)
      setOutcome('idle')
      setBlurReels(false)
      clearInterval(lightsRef.current)
    } else {
      // Start blur after short delay so acceleration is visible
      blurTimerRef.current = setTimeout(() => setBlurReels(true), 300)
    }
    return () => clearTimeout(blurTimerRef.current)
  }, [spinning])

  /* Detect all reels stopped */
  useEffect(() => {
    if (r1 && r2 && r3) {
      setBlurReels(false)
      const oc = isLosePrize ? 'lose' : 'win'
      setOutcome(oc)
      if (oc === 'win') {
        clearInterval(lightsRef.current)
        lightsRef.current = setInterval(() => setLights(l => l + 1), 100)
        setTimeout(() => clearInterval(lightsRef.current), 4000)
      }
      const t = setTimeout(onSpinEnd, 1400)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r1, r2, r3])

  const isWin = outcome === 'win'
  const isLose = outcome === 'lose'
  const GOLD = '#F5C518'
  const GOLD_DARK = '#8B6914'
  const DOT_N = 12

  return (
    <div className="select-none w-full" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <style jsx>{`
        @keyframes loseShake {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        @keyframes winPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.012)} }
        @keyframes bannerIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes coinFly {
          0%{transform:translateY(0) scale(0.6) rotate(0deg);opacity:1}
          100%{transform:translateY(-90px) scale(1.1) rotate(180deg);opacity:0}
        }
        @keyframes redFlash { 0%,100%{opacity:0} 50%{opacity:0.4} }
        @keyframes scrollTicker { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
        .win-machine { animation: winPulse 0.7s ease-in-out infinite; }
        .lose-machine { animation: loseShake 0.6s ease-in-out; }
        .banner { animation: bannerIn 0.4s cubic-bezier(0.22,1,0.36,1); }
        .red-flash { animation: redFlash 0.7s ease-in-out 3; }
        .ticker-inner { display:inline-block; animation: scrollTicker 2.8s linear infinite; white-space:nowrap; }
        .coin-fly { position:absolute; animation: coinFly 1s ease-out forwards; }
      `}</style>

      {/* ── Machine body ──────────────────────────────────────────────── */}
      <div
        className={isWin ? 'win-machine' : isLose ? 'lose-machine' : ''}
        style={{
          width: '100%',
          maxWidth: 380,
          margin: '0 auto',
          background: 'linear-gradient(160deg, #16120a 0%, #0c0c0c 50%, #100810 100%)',
          borderRadius: 28,
          border: `3px solid ${isWin ? GOLD : isLose ? '#CC2200' : '#3a2800'}`,
          boxShadow: isWin
            ? `0 0 50px rgba(245,197,24,0.45), 0 0 100px rgba(245,197,24,0.2), 0 24px 60px rgba(0,0,0,0.9)`
            : isLose
              ? `0 0 40px rgba(204,34,0,0.4), 0 24px 60px rgba(0,0,0,0.9)`
              : `0 24px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,200,50,0.08)`,
          overflow: 'hidden',
          transition: 'border-color 0.4s, box-shadow 0.4s',
          position: 'relative',
        }}
      >
        {/* Red overlay flash on lose */}
        {isLose && (
          <div className="red-flash" style={{
            position: 'absolute', inset: 0,
            background: 'rgba(220,30,0,0.32)',
            zIndex: 30, pointerEvents: 'none',
            borderRadius: 25,
          }} />
        )}

        {/* Coin particles on win */}
        {isWin && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="coin-fly" style={{
            top: '38%',
            left: `${10 + (i * 8) % 78}%`,
            animationDelay: `${i * 0.09}s`,
            fontSize: 22, zIndex: 35,
          }}>🪙</div>
        ))}

        {/* ── Marquee dot lights (top) ─────────────────────────────── */}
        <div style={{
          padding: '14px 20px 8px',
          display: 'flex', justifyContent: 'center', gap: 9,
          background: 'linear-gradient(180deg, #150e00, #0c0c0c)',
        }}>
          {Array.from({ length: DOT_N }).map((_, i) => {
            const on = isWin
              ? (i + lights) % 2 === 0
              : isLose
                ? (i + lights) % 3 === 0
                : spinning ? (i + Math.floor(Date.now() / 200)) % 3 === 0 : false
            const col = isWin
              ? (i % 2 === 0 ? '#FFE566' : '#FF8C00')
              : isLose ? '#FF4422' : '#F47B20'
            return (
              <div key={i} style={{
                width: 9, height: 9, borderRadius: '50%',
                background: on ? `radial-gradient(circle, #fff 10%, ${col})` : '#201400',
                boxShadow: on ? `0 0 8px ${col}, 0 0 18px ${col}66` : 'none',
                transition: 'all 0.1s',
              }} />
            )
          })}
        </div>

        {/* ── Title ────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '4px 20px 10px', minHeight: 40 }}>
          {isLose ? (
            <div className="banner" style={{
              color: '#FF4422', fontSize: 22, fontWeight: 900, letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(255,60,30,0.9)',
            }}>😢&nbsp;&nbsp;DÉSOLÉ&nbsp;!&nbsp;&nbsp;😢</div>
          ) : isWin ? (
            <div className="banner" style={{
              fontSize: 26, fontWeight: 900, letterSpacing: '0.1em',
              background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD} 40%, #FFE566 55%, ${GOLD} 70%, ${GOLD_DARK})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: `drop-shadow(0 0 12px ${GOLD})`,
            }}>🎊&nbsp;JACKPOT&nbsp;!&nbsp;🎊</div>
          ) : spinning ? (
            <div style={{
              fontSize: 20, fontWeight: 900, letterSpacing: '0.12em',
              background: `linear-gradient(90deg, #FF8C00, ${GOLD}, #FF8C00)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>⚡ TOURNEZ... ⚡</div>
          ) : (
            <div style={{
              fontSize: 24, fontWeight: 900, letterSpacing: '0.1em',
              background: `linear-gradient(180deg, #FFE566 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>★&nbsp;LUCKY&nbsp;777&nbsp;★</div>
          )}
        </div>

        {/* ── Reel cabinet ─────────────────────────────────────────── */}
        <div style={{
          margin: '0 12px',
          borderRadius: 18,
          border: `2px solid ${isWin ? GOLD : isLose ? '#882200' : '#2a1a00'}`,
          background: 'linear-gradient(180deg, #07070f 0%, #0b0b14 100%)',
          boxShadow: `inset 0 0 40px rgba(0,0,0,0.9)${isWin ? `, 0 0 20px ${GOLD}55` : ''}`,
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.4s, box-shadow 0.4s',
        }}>
          {/* Payline glow row */}
          {isWin && (
            <div style={{
              position: 'absolute',
              top: CELL, left: 0, right: 0, height: CELL,
              background: `radial-gradient(ellipse at center, ${GOLD}22 0%, transparent 70%)`,
              zIndex: 8, pointerEvents: 'none',
            }} />
          )}

          {/* Payline line */}
          <div style={{
            position: 'absolute',
            top: CELL + CELL / 2 - 1,
            left: 0, right: 0, height: 2,
            background: isWin
              ? `linear-gradient(90deg, transparent 2%, ${GOLD} 20%, #FFE566 50%, ${GOLD} 80%, transparent 98%)`
              : isLose
                ? 'linear-gradient(90deg, transparent 2%, #CC2200 20%, #FF4422 50%, #CC2200 80%, transparent 98%)'
                : `linear-gradient(90deg, transparent 5%, ${GOLD_DARK}66 30%, ${GOLD_DARK}66 70%, transparent 95%)`,
            zIndex: 9, pointerEvents: 'none',
            boxShadow: isWin ? `0 0 12px ${GOLD}` : 'none',
            transition: 'all 0.3s',
          }} />

          {/* Left payline arrow */}
          <div style={{
            position: 'absolute',
            left: 4, top: CELL + CELL / 2 - 8,
            zIndex: 10,
            color: isWin ? GOLD : isLose ? '#CC2200' : `${GOLD_DARK}99`,
            fontSize: 16, lineHeight: 1,
            filter: isWin ? `drop-shadow(0 0 6px ${GOLD})` : 'none',
            transition: 'color 0.3s',
          }}>▶</div>

          {/* Right payline arrow */}
          <div style={{
            position: 'absolute',
            right: 4, top: CELL + CELL / 2 - 8,
            zIndex: 10,
            color: isWin ? GOLD : isLose ? '#CC2200' : `${GOLD_DARK}99`,
            fontSize: 16, lineHeight: 1,
            filter: isWin ? `drop-shadow(0 0 6px ${GOLD})` : 'none',
            transition: 'color 0.3s',
          }}>◀</div>

          {/* ── 3 reels side by side ─── */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, borderRight: `1px solid ${GOLD_DARK}33` }}>
              <Reel strip={strip} N={N} symIdx={r1Sym} spinning={spinning} stopDelay={1800}
                blurring={blurReels} onStopped={() => setR1(true)} />
            </div>
            <div style={{ flex: 1, borderRight: `1px solid ${GOLD_DARK}33` }}>
              <Reel strip={strip} N={N} symIdx={r2Sym} spinning={spinning} stopDelay={2900}
                blurring={blurReels} onStopped={() => setR2(true)} />
            </div>
            <div style={{ flex: 1 }}>
              <Reel strip={strip} N={N} symIdx={r3Sym} spinning={spinning} stopDelay={4000}
                blurring={blurReels} onStopped={() => setR3(true)} />
            </div>
          </div>
        </div>

        {/* ── LCD status bar ───────────────────────────────────────── */}
        <div style={{
          margin: '8px 12px 0',
          background: '#030a03',
          border: `1px solid ${isWin ? '#0d3a0d' : '#051005'}`,
          borderRadius: 10,
          padding: '8px 14px',
          textAlign: 'center',
          boxShadow: `inset 0 0 20px rgba(0,80,0,0.3)`,
          minHeight: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {spinning ? (
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <span className="ticker-inner" style={{
                color: '#00ee00', fontFamily: 'monospace', fontSize: 12,
                fontWeight: 700, letterSpacing: '0.06em',
              }}>
                ✦ BONNE CHANCE ✦ APPUYEZ POUR JOUER ✦ BONNE CHANCE ✦
              </span>
            </div>
          ) : isWin ? (
            <span style={{
              color: '#00FF66', fontFamily: 'monospace', fontSize: 13,
              fontWeight: 900, letterSpacing: '0.07em',
              textShadow: '0 0 12px #00FF66',
            }}>★ VOUS AVEZ GAGNÉ ! ★</span>
          ) : isLose ? (
            <span style={{
              color: '#FF4422', fontFamily: 'monospace', fontSize: 13,
              fontWeight: 900, letterSpacing: '0.06em',
            }}>✗ MEILLEURE CHANCE NEXT TIME ✗</span>
          ) : (
            <span style={{
              color: '#00bb00', fontFamily: 'monospace', fontSize: 12,
              letterSpacing: '0.05em',
            }}>▶ INSÉREZ VOS POINTS POUR JOUER ◀</span>
          )}
        </div>

        {/* ── Bottom info row (balance / win / cost) ────────────────── */}
        <div style={{
          margin: '7px 12px 0',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5,
        }}>
          {[
            { label: 'Solde', val: '🪙 Pts', hi: false },
            {
              label: isLose ? 'Perdu' : 'Gain',
              val: isWin ? (prizes[safeIdx] || '🎁') : isLose ? '—' : '???',
              hi: isWin,
            },
            { label: 'Mise', val: '10 pts', hi: false },
          ].map(({ label, val, hi }) => (
            <div key={label} style={{
              background: '#080808',
              border: `1px solid ${hi ? GOLD + '88' : '#2a1800'}`,
              borderRadius: 8, padding: '5px 6px', textAlign: 'center',
              boxShadow: hi ? `0 0 10px ${GOLD}44` : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              <div style={{
                fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.1em',
                color: GOLD_DARK, textTransform: 'uppercase', marginBottom: 2,
              }}>{label}</div>
              <div style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                color: hi ? GOLD : isLose && label === 'Perdu' ? '#FF4422' : '#ccaa44',
              }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ── Bottom dot lights ────────────────────────────────────── */}
        <div style={{
          padding: '10px 20px 14px',
          display: 'flex', justifyContent: 'center', gap: 9,
          background: 'linear-gradient(0deg, #100a00, transparent)',
          marginTop: 6,
        }}>
          {Array.from({ length: DOT_N }).map((_, i) => {
            const on = isWin
              ? (i + lights + 1) % 2 === 0
              : isLose
                ? (i + lights) % 3 === 0
                : spinning ? (i + 2 + Math.floor(Date.now() / 200)) % 3 === 0 : false
            const col = isWin
              ? (i % 2 === 0 ? '#FF8C00' : GOLD)
              : isLose ? '#FF4422' : '#F47B20'
            return (
              <div key={i} style={{
                width: 9, height: 9, borderRadius: '50%',
                background: on ? `radial-gradient(circle, #fff 10%, ${col})` : '#201400',
                boxShadow: on ? `0 0 8px ${col}, 0 0 18px ${col}66` : 'none',
                transition: 'all 0.1s',
              }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}