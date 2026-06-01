'use client'

import { useState, useEffect } from 'react'

interface BusinessStat {
  name: string
  slug: string
  today: number
  week: number
  month: number
  total: number
}

interface DailyDetail {
  date: string
  count: number
}

export default function SuperAdminAnalytics() {
  const [stats, setStats] = useState<BusinessStat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'today' | 'week' | 'month' | 'total'>('month')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedBusiness, setSelectedBusiness] = useState<{ name: string; slug: string } | null>(null)
  const [dailyDetail, setDailyDetail] = useState<DailyDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/super-admin/analytics')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStats(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...stats]
    .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      return (a[sortField] - b[sortField]) * dir
    })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const handleRowClick = async (business: BusinessStat) => {
    setSelectedBusiness(business)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?period=month&business_slug=${business.slug}`)
      const data = await res.json()
      setDailyDetail(data.daily || [])
    } catch {
      setDailyDetail([])
    } finally {
      setDetailLoading(false)
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-zinc-300 mr-1">↕</span>
    return <span className="text-orange-500 mr-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="p-5 lg:p-6 border-b border-zinc-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📊</span>
          <h3 className="font-bold text-zinc-900 text-lg lg:text-xl">إحصائيات الزيارات — جميع الحسابات</h3>
        </div>
        <input
          type="text"
          placeholder="بحث باسم المقهى..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {selectedBusiness && (
        <div className="mx-5 lg:mx-6 mt-4 p-4 bg-orange-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-zinc-900">{selectedBusiness.name}</h4>
            <button
              onClick={() => setSelectedBusiness(null)}
              className="text-zinc-400 hover:text-zinc-600 text-sm"
            >
              ✕ إغلاق
            </button>
          </div>
          {detailLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : dailyDetail.length > 0 ? (
            <div className="flex items-end gap-2 h-24" style={{ direction: 'ltr' }}>
              {dailyDetail.map(day => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500">{day.count}</span>
                  <div
                    className="w-full bg-orange-400 rounded-t-sm"
                    style={{ height: `${Math.max((day.count / Math.max(...dailyDetail.map(d => d.count), 1)) * 80, 4)}px` }}
                  />
                  <span className="text-[9px] text-zinc-400">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('ar-TN', { weekday: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-4">لا توجد بيانات تفصيلية</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-right px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">اسم المقهى</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('today')}>
                <SortIcon field="today" />اليوم
              </th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('week')}>
                <SortIcon field="week" />هذا الأسبوع
              </th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('month')}>
                <SortIcon field="month" />هذا الشهر
              </th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('total')}>
                <SortIcon field="total" />المجموع
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => (
              <tr
                key={b.slug}
                onClick={() => handleRowClick(b)}
                className={`border-b border-zinc-50 cursor-pointer hover:bg-orange-50/50 transition-colors ${
                  selectedBusiness?.slug === b.slug ? 'bg-orange-50' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium text-zinc-900">{b.name}</td>
                <td className="px-4 py-3 text-center text-zinc-700">{b.today}</td>
                <td className="px-4 py-3 text-center text-zinc-700">{b.week}</td>
                <td className="px-4 py-3 text-center text-zinc-700">{b.month}</td>
                <td className="px-4 py-3 text-center text-zinc-700 font-medium">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">لا توجد بيانات</div>
      )}
    </div>
  )
}
