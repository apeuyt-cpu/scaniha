'use client'

import { useState, useRef, useEffect } from 'react'
import { LOCALE_CONFIGS, type Locale } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/LocaleContext'

export default function LanguageSwitcher({ showLabel = true }: { showLabel?: boolean }) {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options = Object.values(LOCALE_CONFIGS)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span>{LOCALE_CONFIGS[locale].flag}</span>
        {showLabel && <span>{LOCALE_CONFIGS[locale].label}</span>}
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLocale(opt.code as Locale)
                setOpen(false)
              }}
              className={`w-full text-right flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                locale === opt.code
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{opt.flag}</span>
              <span>{opt.label}</span>
              {locale === opt.code && <span className="mr-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
