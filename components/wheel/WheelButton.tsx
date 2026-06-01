'use client'

import { useEffect, useState } from 'react'
import SpinWheelModal from './SpinWheelModal'

interface WheelButtonProps {
  businessId: string
}

function isSameCalendarDay(value: string) {
  const spunDate = new Date(value)
  const today = new Date()

  return (
    spunDate.getDate() === today.getDate() &&
    spunDate.getMonth() === today.getMonth() &&
    spunDate.getFullYear() === today.getFullYear()
  )
}

export default function WheelButton({ businessId }: WheelButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [hasSpunToday, setHasSpunToday] = useState(false)

  useEffect(() => {
    const spun = localStorage.getItem(`wheel_spun_${businessId}`)
    if (spun && isSameCalendarDay(spun)) {
      setHasSpunToday(true)
    }
  }, [businessId])

  const handleSpinRecorded = () => {
    localStorage.setItem(`wheel_spun_${businessId}`, new Date().toISOString())
    setHasSpunToday(true)
  }

  if (hasSpunToday && !showModal) return null

  return (
    <>
      {!hasSpunToday && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-3 rounded-full border border-white/30 bg-zinc-950 px-5 py-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(0,0,0,0.42)] focus:outline-none focus:ring-4 focus:ring-amber-300/50 sm:bottom-6 sm:left-6"
          aria-label="افتح عجلة الحظ"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 shadow-inner">
            <span className="absolute h-2 w-2 rounded-full bg-white" />
            <span className="h-7 w-7 rounded-full border-[3px] border-white/80 border-t-transparent" />
          </span>
          <span className="flex flex-col text-right leading-tight">
            <span className="text-[11px] font-semibold text-amber-200">عرض حصري اليوم</span>
            <span className="text-sm font-black">اربح جائزة</span>
          </span>
        </button>
      )}

      {showModal && (
        <SpinWheelModal
          businessId={businessId}
          onClose={() => setShowModal(false)}
          onSpinRecorded={handleSpinRecorded}
        />
      )}
    </>
  )
}
