'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SEGMENT_COLORS = [
  ['#f59e0b', '#ef4444'],
  ['#14b8a6', '#0f766e'],
  ['#8b5cf6', '#6d28d9'],
  ['#22c55e', '#15803d'],
  ['#ec4899', '#be185d'],
  ['#06b6d4', '#0e7490'],
  ['#f97316', '#c2410c'],
  ['#6366f1', '#4338ca'],
]

interface WheelPrize {
  label: string
  weight: number
  is_winning: boolean
}

interface LuckyWheelProps {
  prizes: WheelPrize[]
  onSpin: () => void
  spinning: boolean
  targetIndex: number | null
  onSpinComplete: () => void
  size?: number
}

type Segment = WheelPrize & {
  originalIndex: number
  startDeg: number
  sweepDeg: number
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360
}

function shortenLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label
  return `${label.slice(0, Math.max(1, maxLength - 3))}...`
}

export default function LuckyWheel({
  prizes,
  onSpin,
  spinning,
  targetIndex,
  onSpinComplete,
  size = 300,
}: LuckyWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const [currentRotation, setCurrentRotation] = useState(0)
  const canvasSize = Math.max(180, size - 22)

  const segments = useMemo<Segment[]>(() => {
    const playablePrizes = prizes
      .map((prize, originalIndex) => ({ ...prize, originalIndex }))
      .filter(prize => Number(prize.weight) > 0)

    const totalWeight = playablePrizes.reduce((sum, prize) => sum + Number(prize.weight || 0), 0)
    let cursor = 0

    return playablePrizes.map(prize => {
      const sweepDeg = (Number(prize.weight || 0) / totalWeight) * 360
      const segment = {
        ...prize,
        startDeg: cursor,
        sweepDeg,
      }
      cursor += sweepDeg
      return segment
    })
  }, [prizes])

  const drawWheel = useCallback((rotationDeg: number) => {
    const canvas = canvasRef.current
    if (!canvas || segments.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    const cx = canvasSize / 2
    const cy = canvasSize / 2
    const radius = canvasSize / 2 - 10
    const innerRadius = radius * 0.18

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.shadowColor = 'rgba(0,0,0,0.38)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 10
    ctx.fill()
    ctx.restore()

    segments.forEach((segment, index) => {
      const startAngle = degreesToRadians(rotationDeg + segment.startDeg - 90)
      const endAngle = degreesToRadians(rotationDeg + segment.startDeg + segment.sweepDeg - 90)
      const middleAngle = degreesToRadians(rotationDeg + segment.startDeg + segment.sweepDeg / 2 - 90)
      const [fromColor, toColor] = SEGMENT_COLORS[index % SEGMENT_COLORS.length]

      const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, radius)
      gradient.addColorStop(0, fromColor)
      gradient.addColorStop(1, toColor)

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.72)'
      ctx.lineWidth = 2
      ctx.stroke()

      if (segment.sweepDeg >= 12) {
        const textRadius = radius * 0.62
        const textX = cx + Math.cos(middleAngle) * textRadius
        const textY = cy + Math.sin(middleAngle) * textRadius

        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.shadowColor = 'rgba(15,23,42,0.45)'
        ctx.shadowBlur = 3

        const fontSize = Math.max(10, Math.min(14, Math.floor((segment.sweepDeg / 360) * canvasSize * 0.48)))
        const label = shortenLabel(segment.label, segment.sweepDeg < 24 ? 6 : 12)
        ctx.font = `800 ${fontSize}px Arial, sans-serif`
        ctx.fillText(label, textX, textY, radius * 0.48)
        ctx.restore()
      }
    })

    for (let tick = 0; tick < 48; tick++) {
      const angle = degreesToRadians(tick * 7.5)
      const x = cx + Math.cos(angle) * (radius + 2)
      const y = cy + Math.sin(angle) * (radius + 2)
      ctx.beginPath()
      ctx.arc(x, y, tick % 4 === 0 ? 2.3 : 1.4, 0, Math.PI * 2)
      ctx.fillStyle = tick % 4 === 0 ? '#fde68a' : 'rgba(255,255,255,0.72)'
      ctx.fill()
    }

    const centerGradient = ctx.createRadialGradient(cx - 8, cy - 9, 4, cx, cy, 36)
    centerGradient.addColorStop(0, '#fff7ed')
    centerGradient.addColorStop(0.42, '#fbbf24')
    centerGradient.addColorStop(1, '#c2410c')

    ctx.beginPath()
    ctx.arc(cx, cy, 35, 0, Math.PI * 2)
    ctx.fillStyle = centerGradient
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#fff'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#111827'
    ctx.fill()
  }, [canvasSize, segments])

  useEffect(() => {
    drawWheel(currentRotation)
  }, [drawWheel, currentRotation])

  useEffect(() => {
    if (!spinning || targetIndex === null || segments.length === 0) return

    const targetSegment = segments.find(segment => segment.originalIndex === targetIndex)
    if (!targetSegment) return

    const targetAngle = normalizeDegrees(-(targetSegment.startDeg + targetSegment.sweepDeg / 2))
    const startRotation = rotationRef.current
    const forwardDelta = normalizeDegrees(targetAngle - startRotation)
    const finalRotation = startRotation + 1800 + forwardDelta
    const duration = 4600
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 4)
      const nextRotation = startRotation + (finalRotation - startRotation) * easedProgress

      rotationRef.current = normalizeDegrees(nextRotation)
      setCurrentRotation(rotationRef.current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        rotationRef.current = normalizeDegrees(finalRotation)
        setCurrentRotation(rotationRef.current)
        onSpinComplete()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [spinning, targetIndex, segments, onSpinComplete])

  return (
    <div
      className="relative mx-auto flex items-start justify-center"
      style={{ width: size, height: size + 28 }}
    >
      <div className="absolute left-1/2 top-0 z-20 h-11 w-10 -translate-x-1/2">
        <div className="mx-auto h-0 w-0 border-l-[17px] border-r-[17px] border-t-[32px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_7px_12px_rgba(0,0,0,0.35)]" />
        <div className="absolute left-1/2 top-1 h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[19px] border-l-transparent border-r-transparent border-t-rose-600" />
      </div>

      <div
        className="absolute left-1/2 rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#fb7185,#22d3ee,#a78bfa,#34d399,#fbbf24)] opacity-55 blur-md"
        style={{ top: 26, width: size, height: size, transform: 'translateX(-50%)' }}
      />
      <div
        className="relative mt-[26px] flex items-center justify-center overflow-hidden rounded-full border-[7px] border-white bg-zinc-950 shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
        style={{ width: size, height: size }}
      >
        <canvas ref={canvasRef} className="rounded-full" />
      </div>

      {!spinning && (
        <button
          onClick={onSpin}
          className="absolute left-1/2 z-30 flex h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-zinc-950 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-200/60"
          style={{ top: 26 + size / 2 }}
          aria-label="تدوير العجلة"
        >
          دور
        </button>
      )}
    </div>
  )
}
