'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const SEGMENT_COLORS = [
  ['#FF6B6B', '#c0392b'],
  ['#4ECDC4', '#16a085'],
  ['#FFE66D', '#f39c12'],
  ['#A8E6CF', '#27ae60'],
  ['#FF8B94', '#e74c3c'],
  ['#95E1D3', '#1abc9c'],
  ['#F38181', '#d35400'],
  ['#AA96DA', '#8e44ad'],
]

interface LuckyWheelProps {
  prizes: { label: string; weight: number; is_winning: boolean }[]
  onSpin: () => void
  spinning: boolean
  targetIndex: number | null
  onSpinComplete: () => void
  size?: number
}

export default function LuckyWheel({
  prizes,
  onSpin,
  spinning,
  targetIndex,
  onSpinComplete,
  size = 280,
}: LuckyWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const [currentRotation, setCurrentRotation] = useState(0)
  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current
    if (!canvas || prizes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displaySize = size
    canvas.width = displaySize * dpr
    canvas.height = displaySize * dpr
    canvas.style.width = `${displaySize}px`
    canvas.style.height = `${displaySize}px`
    ctx.scale(dpr, dpr)

    const cx = displaySize / 2
    const cy = displaySize / 2
    const radius = displaySize / 2 - 10
    const arc = (2 * Math.PI) / prizes.length

    ctx.clearRect(0, 0, displaySize, displaySize)

    prizes.forEach((prize, i) => {
      const startAngle = rotation + i * arc - Math.PI / 2
      const endAngle = startAngle + arc

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()

      const [fillColor, strokeColor] = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
      ctx.fillStyle = fillColor
      ctx.fill()

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + arc / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(11, Math.floor(radius / prizes.length / 2))}px 'Cairo', sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 2
      const label = prize.label.length > 10 ? prize.label.slice(0, 9) + '…' : prize.label
      ctx.fillText(label, radius - 16, 5)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = isDark ? '#1a1a2e' : '#fff'
    ctx.fill()
    ctx.strokeStyle = isDark ? '#333' : '#ddd'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = isDark ? '#fff' : '#333'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎯', cx, cy)
  }, [prizes, size, isDark])

  useEffect(() => {
    drawWheel(currentRotation)
  }, [drawWheel, currentRotation])

  useEffect(() => {
    if (!spinning || targetIndex === null) return

    const segmentAngle = 360 / prizes.length
    const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2)
    const totalRotation = 1440 + targetAngle
    const startRotation = rotationRef.current
    const duration = 4000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentAngle = startRotation + (totalRotation - startRotation) * easeOut

      rotationRef.current = currentAngle % 360
      setCurrentRotation((currentAngle * Math.PI) / 180)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        rotationRef.current = totalRotation % 360
        setCurrentRotation((totalRotation * Math.PI) / 180)
        onSpinComplete()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [spinning, targetIndex, prizes.length, onSpinComplete])

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div
        className="absolute z-10"
        style={{
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #e74c3c',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />
      <div
        className="rounded-full"
        style={{
          border: '4px solid #e74c3c',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          width: size,
          height: size,
        }}
      >
        <canvas ref={canvasRef} />
      </div>
      {!spinning && (
        <button
          onClick={onSpin}
          className="absolute rounded-full flex items-center justify-center text-lg font-bold cursor-pointer hover:scale-105 transition-transform"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44,
            height: 44,
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: '3px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 20,
          }}
        >
          ⟳
        </button>
      )}
    </div>
  )
}
