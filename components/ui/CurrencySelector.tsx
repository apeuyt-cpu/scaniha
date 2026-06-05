'use client'

import { useState, useRef, useEffect } from 'react'
import { useCurrency } from '@/lib/i18n/CurrencyContext'

export default function CurrencySelector({ showLabel = true }: { showLabel?: boolean }) {
  const { currency, currencyCode, setCurrency, availableCurrencies } = useCurrency()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search
    ? availableCurrencies.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      )
    : availableCurrencies

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="text-base">{currency.flag}</span>
        {showLabel && <span>{currency.code} - {currency.symbolNative}</span>}
        {!showLabel && <span>{currency.code}</span>}
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 py-1 min-w-[280px] max-h-[320px] overflow-y-auto">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency..."
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              autoFocus
            />
          </div>
          {filtered.slice(0, 100).map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code)
                setOpen(false)
                setSearch('')
              }}
              className={`w-full text-right flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                currencyCode === c.code
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base w-6">{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">{c.name}</span>
              <span className="mr-auto text-xs text-zinc-500">{c.symbolNative}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              No currencies found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
