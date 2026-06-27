import { getCurrencyInfo, isZeroDecimalCurrency } from './iso-currencies'
import type { Locale } from '@/lib/i18n/config'

export function formatPrice(
  amount: number | null | undefined,
  currencyCode: string = 'TND',
  locale: Locale = 'fr'
): string {
  if (amount === null || amount === undefined) return ''

  try {
    const localeMap: Record<Locale, string> = { fr: 'fr-TN' }
    const localeStr = localeMap[locale] || 'fr-TN'

    const formatter = new Intl.NumberFormat(localeStr, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: isZeroDecimalCurrency(currencyCode) ? 0 : 2,
      maximumFractionDigits: isZeroDecimalCurrency(currencyCode) ? 0 : 2,
    })

    return formatter.format(amount)
  } catch {
    const info = getCurrencyInfo(currencyCode)
    const decimals = isZeroDecimalCurrency(currencyCode) ? 0 : 2
    return `${info.symbol}${amount.toFixed(decimals)}`
  }
}

export function formatPriceInput(amount: number | null | undefined, currencyCode: string = 'TND'): string {
  if (amount === null || amount === undefined) return ''
  const decimals = isZeroDecimalCurrency(currencyCode) ? 0 : 2
  return amount.toFixed(decimals)
}

export function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,\-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount
  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]
  if (!fromRate || !toRate) return amount
  return (amount / fromRate) * toRate
}

export function getCurrencySymbol(code: string): string {
  return getCurrencyInfo(code).symbolNative
}
