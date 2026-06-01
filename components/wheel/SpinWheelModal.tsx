'use client'

import { useEffect, useState } from 'react'
import LuckyWheel from './LuckyWheel'

interface Prize {
  id?: string
  label: string
  weight: number
  is_winning: boolean
}

interface Ticket {
  id?: string
  code: string
  prize: string
  issued_at: string
  expires_at: string
}

interface SpinResult {
  prizeIndex: number
  prize: Prize
  won: boolean
  ticket: Ticket | null
}

interface SpinWheelModalProps {
  businessId: string
  onClose: () => void
  onSpinRecorded?: () => void
}

export default function SpinWheelModal({ businessId, onClose, onSpinRecorded }: SpinWheelModalProps) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [spinRecorded, setSpinRecorded] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/wheel/prizes?business_id=${businessId}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل الجوائز')
        }
        return data
      })
      .then(data => {
        if (cancelled) return
        if (Array.isArray(data) && data.some(prize => Number(prize.weight) > 0)) {
          setPrizes(data)
        } else {
          setError('لا توجد جوائز متاحة حاليا')
        }
      })
      .catch(error => {
        if (!cancelled) setError(error.message || 'فشل تحميل الجوائز')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [businessId])

  const recordSpinOnce = () => {
    if (spinRecorded) return
    setSpinRecorded(true)
    onSpinRecorded?.()
  }

  const handleSpin = async () => {
    if (spinning || loading || result) return
    setError(null)
    setCopied(false)

    try {
      const res = await fetch('/api/wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء تدوير العجلة')
        return
      }

      setResult(data)
      setTargetIndex(data.prizeIndex)
      setSpinning(true)
      recordSpinOnce()
    } catch {
      setError('فشل الاتصال. حاول مرة أخرى.')
    }
  }

  const handleSpinComplete = () => {
    setSpinning(false)
    setTargetIndex(null)
  }

  const copyTicketCode = async () => {
    if (!result?.ticket?.code) return

    try {
      await navigator.clipboard.writeText(result.ticket.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const hasWonTicket = Boolean(result?.won && result.ticket)
  const canSpin = prizes.some(prize => Number(prize.weight) > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md" />
      <div
        className="relative max-h-[94vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-white/15 bg-zinc-950 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
        onClick={event => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl leading-none text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 rounded-t-[28px] bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.34),transparent_58%)]" />
        <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          <div className="mx-auto mb-4 w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
            فرصة واحدة كل يوم
          </div>
          <h2 className="text-center text-3xl font-black tracking-normal text-white">عجلة الحظ</h2>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-6 text-zinc-300">
            أدر العجلة، والنتيجة يتم تسجيلها تلقائيا. إذا ربحت ستحصل على تذكرة رسمية فورا.
          </p>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/12 p-3 text-center text-sm font-semibold text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-center">
            {loading ? (
              <div className="flex h-[300px] w-[300px] items-center justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-amber-300 animate-spin" />
              </div>
            ) : (
              <LuckyWheel
                prizes={prizes}
                spinning={spinning}
                targetIndex={targetIndex}
                onSpin={handleSpin}
                onSpinComplete={handleSpinComplete}
                size={300}
              />
            )}
          </div>

          {!spinning && !result && !loading && (
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className="mt-5 w-full rounded-2xl bg-gradient-to-l from-amber-300 via-orange-500 to-rose-600 px-5 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(249,115,22,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              ابدأ السحب
            </button>
          )}

          {spinning && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm font-semibold text-amber-100">
              جاري اختيار جائزتك بدقة...
            </div>
          )}

          {result && !spinning && (
            <div className="mt-5">
              {hasWonTicket ? (
                <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300 text-2xl font-black text-emerald-950">
                    ✓
                  </div>
                  <h3 className="text-2xl font-black text-emerald-100">مبروك، ربحت</h3>
                  <p className="mt-2 text-sm text-emerald-50">
                    جائزتك: <strong>{result.ticket?.prize}</strong>
                  </p>

                  <button
                    type="button"
                    onClick={copyTicketCode}
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-white p-4 text-center text-zinc-950 transition hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-emerald-300/30"
                    dir="ltr"
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Ticket code
                    </span>
                    <span className="mt-1 block font-mono text-2xl font-black tracking-widest">
                      {result.ticket?.code}
                    </span>
                    <span className="mt-2 block text-xs font-bold text-emerald-700">
                      {copied ? 'تم نسخ الرمز' : 'اضغط لنسخ الرمز'}
                    </span>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-50/90">
                    <div className="rounded-xl bg-white/10 p-3">
                      <span className="block text-emerald-100/70">تاريخ الإصدار</span>
                      <strong>{new Date(result.ticket!.issued_at).toLocaleDateString('ar-TN')}</strong>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <span className="block text-emerald-100/70">صالحة حتى</span>
                      <strong>{new Date(result.ticket!.expires_at).toLocaleDateString('ar-TN')}</strong>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-emerald-50/75">
                    احتفظ بهذا الرمز وقدمه للفريق عند الطلب. كل تذكرة تستعمل مرة واحدة فقط.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white">
                    –
                  </div>
                  <h3 className="text-2xl font-black text-white">لم تربح هذه المرة</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    النتيجة المسجلة هي: <strong className="text-white">{result.prize.label}</strong>. عد غدا لفرصة جديدة.
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
