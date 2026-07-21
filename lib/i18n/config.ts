export const SUPPORTED_LOCALES = ['fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

export interface LocaleConfig {
  code: Locale
  label: string
  dir: 'ltr' | 'rtl'
  dateFormat: string
  timeFormat: string
  flag: string
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  fr: { code: 'fr', label: 'Français', dir: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', flag: '🇫🇷' },
}

export function getLocaleFromPath(_pathname: string): Locale {
  return DEFAULT_LOCALE
}

export function getBrowserLocale(): Locale {
  return DEFAULT_LOCALE
}
