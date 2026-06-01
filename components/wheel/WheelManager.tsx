'use client'

import { useState, useEffect } from 'react'

interface Prize {
  id?: string
  label: string
  weight: number
  is_winning: boolean
  stock?: number | null
  stock_remaining?: number | null
}

interface Ticket {
  id: string
  prize_label: string
  ticket_code: string
  issued_at: string
  expires_at: string
  redeemed: boolean
  redeemed_at: string | null
}

interface WheelManagerProps {
  businessId: string
  initialVisible?: boolean
}

export default function WheelManager({ businessId, initialVisible = false }: WheelManagerProps) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [wheelVisible, setWheelVisible] = useState(initialVisible)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'prizes' | 'tickets'>('prizes')
  const [editIndex, setEditIndex] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prizesRes, ticketsRes] = await Promise.all([
        fetch(`/api/wheel/prizes?business_id=${businessId}`),
        fetch('/api/wheel/tickets'),
      ])

      if (prizesRes.ok) setPrizes(await prizesRes.json())
      if (ticketsRes.ok) setTickets(await ticketsRes.json())
    } catch (err) {
      console.error('Error loading wheel data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wheel_visible: !wheelVisible }),
      })
      if (res.ok) {
        setWheelVisible(!wheelVisible)
        setSuccess(wheelVisible ? 'تم إخفاء العجلة' : 'تم إظهار العجلة')
      } else {
        const data = await res.json()
        setError(data.error || 'فشل التحديث')
      }
    } catch {
      setError('حدث خطأ')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSavePrizes = async () => {
    const totalWeight = prizes.reduce((sum, p) => sum + (p.weight || 0), 0)
    if (totalWeight !== 100) {
      setError(`مجموع النسب يجب أن يساوي 100 (الحالي: ${totalWeight})`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/wheel/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizes }),
      })
      if (res.ok) {
        setSuccess('تم حفظ الجوائز بنجاح')
        setEditIndex(null)
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'فشل الحفظ')
      }
    } catch {
      setError('حدث خطأ')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const addPrize = () => {
    setPrizes([...prizes, { label: '', weight: 0, is_winning: true, stock: null }])
    setEditIndex(prizes.length)
  }

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index))
    setEditIndex(null)
  }

  const updatePrize = (index: number, field: keyof Prize, value: any) => {
    const updated = [...prizes]
    ;(updated[index] as any)[field] = value
    setPrizes(updated)
  }

  const handleRedeemTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/wheel/tickets/${ticketId}`, { method: 'PATCH' })
      if (res.ok) {
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, redeemed: true, redeemed_at: new Date().toISOString() } : t))
        setSuccess('تم تأكيد الاستلام')
      } else {
        const data = await res.json()
        setError(data.error || 'فشل')
      }
    } catch {
      setError('حدث خطأ')
    }
    setTimeout(() => { setSuccess(null); setError(null) }, 3000)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎡</span>
          <h3 className="font-bold text-zinc-900 text-lg lg:text-xl">عجلة الحظ</h3>
        </div>
        <button
          onClick={handleToggleVisibility}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            wheelVisible
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          }`}
        >
          {wheelVisible ? '🟢 ظاهر للعملاء' : '⚪ مخفي'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-xl">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-zinc-100 pb-3">
        <button
          onClick={() => setActiveTab('prizes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'prizes' ? 'bg-orange-100 text-orange-700' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          الجوائز
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'tickets' ? 'bg-orange-100 text-orange-700' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          التذاكر {tickets.length > 0 && `(${tickets.length})`}
        </button>
      </div>

      {activeTab === 'prizes' && (
        <div>
          <div className="space-y-3 mb-4">
            {prizes.map((prize, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={prize.label}
                    onChange={e => updatePrize(i, 'label', e.target.value)}
                    placeholder="اسم الجائزة"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500">النسبة (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={prize.weight}
                        onChange={e => updatePrize(i, 'weight', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500">الكمية (0=غير محدود)</label>
                      <input
                        type="number"
                        min="0"
                        value={prize.stock ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value) || 0
                          updatePrize(i, 'stock', val)
                        }}
                        placeholder="غير محدود"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <label className="text-xs text-zinc-500">ربح</label>
                      <input
                        type="checkbox"
                        checked={prize.is_winning}
                        onChange={e => updatePrize(i, 'is_winning', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  {prize.stock != null && prize.stock > 0 && prize.stock_remaining != null && (
                    <p className="text-xs text-zinc-400">
                      متبقي: {prize.stock_remaining} من {prize.stock}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removePrize(i)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all self-start mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addPrize}
              className="px-4 py-2 border-2 border-dashed border-zinc-300 text-zinc-500 rounded-xl text-sm font-medium hover:border-orange-500 hover:text-orange-500 transition-all"
            >
              + إضافة جائزة
            </button>
            {prizes.length > 0 && (
              <button
                onClick={handleSavePrizes}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الجوائز'}
              </button>
            )}
          </div>

          {prizes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-xl">
              مجموع النسب: {prizes.reduce((s, p) => s + (p.weight || 0), 0)}% (يجب أن يساوي 100%)
            </div>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div>
          {tickets.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">لا توجد تذاكر حتى الآن</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tickets.map(ticket => {
                const isExpired = new Date(ticket.expires_at) < new Date()
                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border ${
                      ticket.redeemed
                        ? 'bg-green-50 border-green-200'
                        : isExpired
                          ? 'bg-red-50 border-red-200'
                          : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-900">{ticket.prize_label}</p>
                        <p className="text-sm font-mono text-zinc-500 mt-1" dir="ltr">{ticket.ticket_code}</p>
                        <div className="text-xs text-zinc-400 mt-1">
                          <span>تاريخ الإصدار: {new Date(ticket.issued_at).toLocaleDateString('ar-TN')}</span>
                          <span className="mx-1">|</span>
                          <span>صلاحية حتى: {new Date(ticket.expires_at).toLocaleDateString('ar-TN')}</span>
                        </div>
                      </div>
                      {!ticket.redeemed && !isExpired && (
                        <button
                          onClick={() => handleRedeemTicket(ticket.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-all whitespace-nowrap"
                        >
                          تأكيد الاستلام
                        </button>
                      )}
                      {ticket.redeemed && (
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium whitespace-nowrap">
                          ✅ تم الاستلام
                        </span>
                      )}
                      {isExpired && !ticket.redeemed && (
                        <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium whitespace-nowrap">
                          منتهية
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
