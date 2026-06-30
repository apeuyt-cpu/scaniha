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

// App is TND-only.
const FIXED_CURRENCY = 'TND'
const TND_ONLY = ISO_CURRENCIES.filter((c) => c.code === FIXED_CURRENCY)

const CurrencyContext = createContext<CurrencyContextType>({
  currency: getCurrencyInfo(FIXED_CURRENCY),
  currencyCode: FIXED_CURRENCY,
  setCurrency: () => {},
  formatPrice: () => '',
  convertFromTnd: (a) => a,
  availableCurrencies: TND_ONLY,
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()
  const [currencyCode] = useState<string>(FIXED_CURRENCY)
  const [dbLoaded, setDbLoaded] = useState(false)

  useEffect(() => {
    setDbLoaded(true)
  }, [])

  // Currency is fixed to TND; selector is a no-op kept for API compatibility.
  const setCurrency = useCallback((_code: string) => {}, [])

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
        availableCurrencies: TND_ONLY,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
