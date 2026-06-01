'use client'

import { useState, useEffect } from 'react'
import LuckyWheel from './LuckyWheel'

interface Prize {
  id?: string
  label: string
  weight: number
  is_winning: boolean
}

interface Ticket {
  code: string
  prize: string
  issued_at: string
  expires_at: string
}

interface SpinResult {
  prizeIndex: number
  prize: Prize
  won: boolean
  ticket: Ticket | null
}

interface SpinWheelModalProps {
  businessId: string
  onClose: () => void
}

export default function SpinWheelModal({ businessId, onClose }: SpinWheelModalProps) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/wheel/prizes?business_id=${businessId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPrizes(data)
        } else {
          setError('لا توجد جوائز متاحة حالياً')
        }
      })
      .catch(() => setError('فشل تحميل الجوائز'))
      .finally(() => setLoading(false))
  }, [businessId])

  const handleSpin = async () => {
    if (spinning || loading) return
    setError(null)

    try {
      const res = await fetch('/api/wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حدث خطأ')
        return
      }

      setResult(data)
      setTargetIndex(data.prizeIndex)
      setSpinning(true)
    } catch {
      setError('فشل الاتصال. حاول مرة أخرى.')
    }
  }

  const handleSpinComplete = () => {
    setSpinning(false)
    setTargetIndex(null)
  }

  const handleClose = () => {
    setSpinning(false)
    setResult(null)
    setTargetIndex(null)
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-2xl leading-none"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center text-zinc-900 dark:text-white mb-2">عجلة الحظ</h2>
        <p className="text-center text-zinc-500 dark:text-zinc-400 text-sm mb-6">اختر وأدر العجلة لتربح جائزة</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl p-3 mb-4 text-center">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          {loading ? (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <LuckyWheel
              prizes={prizes}
              spinning={spinning}
              targetIndex={targetIndex}
              onSpin={handleSpin}
              onSpinComplete={handleSpinComplete}
              size={280}
            />
          )}
        </div>

        {!spinning && !result && !loading && (
          <button
            onClick={handleSpin}
            className="w-full py-3 bg-gradient-to-l from-orange-500 to-amber-500 text-white font-bold rounded-xl text-lg hover:shadow-lg transition-all"
          >
            أدر العجلة!
          </button>
        )}

        {result && !spinning && (
          <div className="text-center">
            {result.won && result.ticket ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-1">تهانينا!</h3>
                <p className="text-green-600 dark:text-green-500 mb-3">لقد ربحت: <strong>{result.ticket.prize}</strong></p>
                <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 mb-2" dir="ltr">
                  <p className="text-xs text-zinc-500 mb-1">رمز التذكرة</p>
                  <p className="text-lg font-mono font-bold tracking-wider text-zinc-900 dark:text-white">{result.ticket.code}</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  صلاحية التذكرة حتى: {new Date(result.ticket.expires_at).toLocaleDateString('ar-TN')}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">أظهر رمز التذكرة للمطعم للحصول على جائزتك</p>
              </div>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-5">
                <div className="text-4xl mb-2">😢</div>
                <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-1">للأسف!</h3>
                <p className="text-zinc-500 dark:text-zinc-400">لم تربح هذه المرة. حاول مرة أخرى غداً!</p>
              </div>
            )}
            <button
              onClick={handleClose}
              className="w-full mt-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
