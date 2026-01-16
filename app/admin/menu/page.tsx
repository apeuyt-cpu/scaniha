'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MenuManager from '@/components/admin/MenuManager'

export default function MenuPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBusiness()
  }, [])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      if (res.ok) {
        const data = await res.json()
        setBusinessId(data.id)
      }
    } catch (err) {
      console.error('Error fetching business:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-zinc-500">لم يتم العثور على نشاط تجاري</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-page p-4 lg:p-8 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors text-lg"
          >
            →
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-zinc-900">منشئ القائمة</h1>
            <p className="text-sm lg:text-base text-zinc-500">إدارة الفئات والعناصر</p>
          </div>
        </div>
      </div>

      <MenuManager businessId={businessId} />
    </div>
  )
}
