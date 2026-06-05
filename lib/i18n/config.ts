export const SUPPORTED_LOCALES = ['en', 'ar', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export interface LocaleConfig {
  code: Locale
  label: string
  dir: 'ltr' | 'rtl'
  dateFormat: string
  timeFormat: string
  flag: string
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: { code: 'en', label: 'English', dir: 'ltr', dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', flag: '🇺🇸' },
  ar: { code: 'ar', label: 'العربية', dir: 'rtl', dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A', flag: '🇸🇦' },
  fr: { code: 'fr', label: 'Français', dir: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', flag: '🇫🇷' },
}

export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0] as Locale)) {
    return segments[0] as Locale
  }
  return DEFAULT_LOCALE
}

export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = localStorage.getItem('scaniha-locale')
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale
  const browserLang = navigator.language.slice(0, 2).toLowerCase()
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) return browserLang as Locale
  return DEFAULT_LOCALE
}
