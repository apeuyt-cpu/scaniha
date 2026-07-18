'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ISO_CURRENCIES, getCurrencyInfo, type CurrencyInfo } from '@/lib/currency/iso-currencies'
import { formatPrice as formatPriceUtil } from '@/lib/currency/format'
import { convertFromTnd as convertFromTndUtil } from '@/lib/currency/exchange-rates'
import { useLocale } from './LocaleContext'

interface CurrencyContextType {
  currency: CurrencyInfo
  currencyCode: string
  setCurrency: (code: string) => void
  formatPrice: (amount: number | null | undefined) => string
  convertFromTnd: (amount: number) => number
  availableCurrencies: CurrencyInfo[]
}

// Default to TND but allow dynamic switching
const DEFAULT_CURRENCY = 'TND'

const CurrencyContext = createContext<CurrencyContextType>({
  currency: getCurrencyInfo(DEFAULT_CURRENCY),
  currencyCode: DEFAULT_CURRENCY,
  setCurrency: () => {},
  formatPrice: () => '',
  convertFromTnd: (a) => a,
  availableCurrencies: ISO_CURRENCIES,
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()
  const [currencyCode, setCurrencyCode] = useState<string>(DEFAULT_CURRENCY)
  const [dbLoaded, setDbLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('scaniha-currency')
      if (stored && ISO_CURRENCIES.some((c) => c.code === stored)) {
        setCurrencyCode(stored)
      }
    } catch (e) {}
    setDbLoaded(true)
  }, [])

  const setCurrency = useCallback((code: string) => {
    if (ISO_CURRENCIES.some((c) => c.code === code)) {
      setCurrencyCode(code)
      try {
        localStorage.setItem('scaniha-currency', code)
      } catch (e) {}
    }
  }, [])

  const formatPrice = useCallback(
    (amount: number | null | undefined) => {
      return formatPriceUtil(amount, currencyCode, locale)
    },
    [currencyCode, locale]
  )

  const convertFromTnd = useCallback(
    (amount: number) => {
      return convertFromTndUtil(amount, currencyCode)
    },
    [currencyCode]
  )

  if (!dbLoaded) {
    return <>{children}</>
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency: getCurrencyInfo(currencyCode),
        currencyCode,
        setCurrency,
        formatPrice,
        convertFromTnd,
        availableCurrencies: ISO_CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
