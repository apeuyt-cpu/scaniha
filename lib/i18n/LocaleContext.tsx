'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { DEFAULT_LOCALE, LOCALE_CONFIGS, type Locale } from './config'
import frTranslations from '../../public/locales/fr/common.json'

interface Translations {
  [key: string]: any
}

interface LocaleContextType {
  locale: Locale
  dir: 'ltr' | 'rtl'
  translations: Translations
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

function resolveNested(obj: any, path: string): string {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path
    current = current[key]
  }
  return typeof current === 'string' ? current : path
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`
  )
}

// The app is French-only, so the translations are bundled and available
// synchronously on both the server and the client — no runtime fetch, no
// flash of raw translation keys.
const translations = frTranslations as Translations

function translate(key: string, params?: Record<string, string | number>): string {
  return interpolate(resolveNested(translations, key), params)
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  dir: LOCALE_CONFIGS[DEFAULT_LOCALE].dir,
  translations,
  setLocale: () => {},
  t: translate,
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback(translate, [])
  return (
    <LocaleContext.Provider
      value={{
        locale: DEFAULT_LOCALE,
        dir: LOCALE_CONFIGS[DEFAULT_LOCALE].dir,
        translations,
        setLocale: () => {},
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

export function useTranslation() {
  const { t } = useContext(LocaleContext)
  return { t }
}
