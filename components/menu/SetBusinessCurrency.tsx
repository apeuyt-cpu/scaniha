'use client'

import { useEffect } from 'react'
import { useCurrency } from '@/lib/i18n/CurrencyContext'

export default function SetBusinessCurrency({ currency }: { currency?: string | null }) {
  const { setCurrency } = useCurrency()
  
  useEffect(() => {
    if (currency) {
      setCurrency(currency)
    }
  }, [currency, setCurrency])
  
  return null
}
