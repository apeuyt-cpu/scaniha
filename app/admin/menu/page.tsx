'use client'

import { useState, useEffect } from 'react'
import MenuManager from '@/components/admin/MenuManager'
import PageShell from '@/components/admin/ui/PageShell'

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
          <p className="text-zinc-500">Aucun établissement trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <PageShell
      title="Menu"
      subtitle="Gérez vos catégories, plats et prix."
      width="6xl"
    >
      <MenuManager businessId={businessId} />
    </PageShell>
  )
}
