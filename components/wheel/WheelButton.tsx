'use client'

import { useState, useEffect } from 'react'
import SpinWheelModal from './SpinWheelModal'

interface WheelButtonProps {
  businessId: string
}

export default function WheelButton({ businessId }: WheelButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [hasSpunToday, setHasSpunToday] = useState(false)

  useEffect(() => {
    const spun = localStorage.getItem(`wheel_spun_${businessId}`)
    if (spun) {
      const spunDate = new Date(spun)
      const today = new Date()
      if (
        spunDate.getDate() === today.getDate() &&
        spunDate.getMonth() === today.getMonth() &&
        spunDate.getFullYear() === today.getFullYear()
      ) {
        setHasSpunToday(true)
      }
    }
  }, [businessId])

  const handleOpen = () => {
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    localStorage.setItem(`wheel_spun_${businessId}`, new Date().toISOString())
    setHasSpunToday(true)
  }

  if (hasSpunToday) return null

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl transition-all animate-bounce"
        style={{ animationDuration: '2s' }}
      >
        <span className="text-xl">🎡</span>
        <span className="text-sm font-bold">اربح جائزة</span>
      </button>
      {showModal && (
        <SpinWheelModal businessId={businessId} onClose={handleClose} />
      )}
    </>
  )
}
