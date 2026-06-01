'use client'

import { useState, useEffect } from 'react'

interface DailyView {
  date: string
  count: number
}

interface AnalyticsData {
  total: number
  mobileViews: number
  desktopViews: number
  daily: DailyView[]
}

export default function MenuAnalytics() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const maxCount = Math.max(...(data?.daily.map(d => d.count) || [1]), 1)

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('ar-TN', { weekday: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">📊</span>
        <h3 className="font-bold text-zinc-900 text-lg lg:text-xl">إحصائيات الزيارات</h3>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'today' as const, label: 'اليوم' },
          { key: 'week' as const, label: 'هذا الأسبوع' },
          { key: 'month' as const, label: 'هذا الشهر' },
        ]).map(btn => (
          <button
            key={btn.key}
            onClick={() => setPeriod(btn.key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              period === btn.key
                ? 'bg-orange-500 text-white shadow'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{data.total}</p>
              <p className="text-xs text-orange-500 mt-1">عدد الزوار</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{data.desktopViews}</p>
              <p className="text-xs text-blue-500 mt-1">حاسوب</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{data.mobileViews}</p>
              <p className="text-xs text-green-500 mt-1">جوال</p>
            </div>
          </div>

          {/* Daily Bar Chart */}
          {data.daily.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-3">الزيارات اليومية</p>
              <div className="flex items-end gap-1.5 h-32" style={{ direction: 'ltr' }}>
                {data.daily.map(day => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {day.count}
                    </span>
                    <div
                      className="w-full bg-orange-400 rounded-t-sm transition-all hover:bg-orange-500"
                      style={{
                        height: `${Math.max((day.count / maxCount) * 100, 4)}%`,
                        minHeight: day.count > 0 ? 4 : 0,
                      }}
                    />
                    <span className="text-[10px] text-zinc-500 -rotate-45 origin-left whitespace-nowrap mt-1">
                      {formatDay(day.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">لا توجد زيارات في هذه الفترة</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-zinc-400 text-sm">فشل تحميل الإحصائيات</p>
        </div>
      )}
    </div>
  )
}
