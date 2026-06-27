'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ModernMenuBuilder from '@/components/menu/ModernMenuBuilder'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

export default function MenuManager({ businessId }: { businessId: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const fetchCategories = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const { data: cats, error } = await supabase
        .from('categories')
        .select(`
          *,
          items (*)
        `)
        .eq('business_id', businessId)
        .order('position', { ascending: true })

      if (error) throw error
      setCategories((cats || []) as Category[])
      setFailed(false)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-zinc-900">Menu indisponible</p>
        <p className="mt-1 text-sm text-zinc-500">Le chargement a échoué. Vérifiez votre connexion et réessayez.</p>
        <button
          onClick={fetchCategories}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Réessayer
        </button>
      </div>
    )
  }

  return <ModernMenuBuilder businessId={businessId} initialCategories={categories} />
}
