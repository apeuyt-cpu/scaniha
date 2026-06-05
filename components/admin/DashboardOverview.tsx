'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { useLocale } from '@/lib/i18n/LocaleContext'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

interface Business {
  id: string
  name: string
  slug: string
  theme_id: string
  status: 'active' | 'paused'
}

export default function DashboardOverview({ business }: { business: Business }) {
  const { t, dir } = useLocale()
  const [stats, setStats] = useState({
    categories: 0,
    items: 0,
    availableItems: 0
  })
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [business.id])

  const fetchStats = async () => {
    try {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, items(*)')
        .eq('business_id', business.id) as { data: Category[] | null }

      if (categories) {
        const allItems = categories.flatMap(cat => cat.items || [])
        setStats({
          categories: categories.length,
          items: allItems.length,
          availableItems: allItems.filter(item => item.available).length
        })
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const menuUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${business.slug}`
    : `/${business.slug}`

  return (
    <div className="p-6 lg:p-8" dir={dir}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.title')}</h2>
        <p className="text-gray-600">{t('dashboard.overview')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className={`flex items-center ${dir === 'rtl' ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-blue-600 text-sm font-medium">{t('dashboard.categories')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.categories}</p>
            </div>
            <div className="text-4xl">📂</div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <div className={`flex items-center ${dir === 'rtl' ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-green-600 text-sm font-medium">{t('dashboard.totalItems')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.items}</p>
            </div>
            <div className="text-4xl">🍽️</div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
          <div className={`flex items-center ${dir === 'rtl' ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-purple-600 text-sm font-medium">{t('dashboard.available')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.availableItems}</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/admin/menu"
          className="block p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🍽️</div>
            <div>
              <h3 className="text-xl font-bold mb-1">{t('dashboard.manageMenu')}</h3>
              <p className="text-blue-100">{t('dashboard.addItems')}</p>
            </div>
          </div>
        </Link>

        <a
          href={menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">👁️</div>
            <div>
              <h3 className="text-xl font-bold mb-1">{t('dashboard.viewMenu')}</h3>
              <p className="text-green-100">{t('dashboard.seePublic')}</p>
            </div>
          </div>
        </a>
      </div>

      {/* Business Info */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.businessInfo')}</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">{t('dashboard.businessName')}</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{business.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">{t('dashboard.status')}</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                business.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {business.status === 'active' ? t('pricing.active') : t('dashboard.menuPaused')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">{t('dashboard.theme')}</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium capitalize">{business.theme_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">{t('dashboard.menuUrl')}</dt>
            <dd className="mt-1">
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 font-mono text-sm"
              >
                {menuUrl}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

