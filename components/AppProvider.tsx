'use client'

import { LocaleProvider } from '@/lib/i18n/LocaleContext'
import { CurrencyProvider } from '@/lib/i18n/CurrencyContext'

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </LocaleProvider>
  )
}
