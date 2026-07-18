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

export function CurrencyProvider({ children, initialCurrency }: { children: React.ReactNode, initialCurrency?: string }) {
  const { locale } = useLocale()
  
  // Default to initialCurrency if provided and valid, otherwise TND
  const startCurrency = initialCurrency && ISO_CURRENCIES.find(c => c.code === initialCurrency)
    ? initialCurrency
    : 'TND'
    
  const [currencyCode, setCurrencyCode] = useState<string>(startCurrency)
  const [dbLoaded, setDbLoaded] = useState(false)

  useEffect(() => {
    // If there's a locally saved currency preference that differs, we could load it here
    // But since the menu currency is dictated by the business settings, we stick to initialCurrency.
    setDbLoaded(true)
  }, [])

  const setCurrency = useCallback((code: string) => {
    setCurrencyCode(code)
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
