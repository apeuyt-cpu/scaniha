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
      
      // Check if response is OK and is JSON
      if (res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json()
          setBusinessId(data.id)
        } else {
          // Response is not JSON (likely HTML redirect or error page)
          console.error('Error fetching business: Response is not JSON')
          // Try to reload the page to handle redirects
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      } else {
        // Handle non-OK responses
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('Error fetching business:', errorData.error || 'Unknown error')
        } else {
          console.error('Error fetching business: HTTP', res.status)
          // If unauthorized, redirect to login
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      }
    } catch (err) {
      console.error('Error fetching business:', err)
      // If it's a JSON parse error, it means we got HTML instead of JSON
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        console.error('Received HTML instead of JSON - possible redirect or error page')
        // Try to reload to handle redirects
        window.location.reload()
      }
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
