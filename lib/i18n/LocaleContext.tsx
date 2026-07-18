'use client'

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { DEFAULT_LOCALE, LOCALE_CONFIGS, type Locale } from './config'
import frTranslations from '../../public/locales/fr/common.json'
import enTranslations from '../../public/locales/en/common.json'
import arTranslations from '../../public/locales/ar/common.json'

const ALL_TRANSLATIONS: Record<Locale, Translations> = {
  fr: frTranslations as Translations,
  en: enTranslations as Translations,
  ar: arTranslations as Translations,
}

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

// Initial synchronous state for SSR / default
const initialTranslations = ALL_TRANSLATIONS[DEFAULT_LOCALE]

function translate(key: string, localeTranslations: Translations, params?: Record<string, string | number>): string {
  return interpolate(resolveNested(localeTranslations, key), params)
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  dir: LOCALE_CONFIGS[DEFAULT_LOCALE].dir,
  translations: initialTranslations,
  setLocale: () => {},
  t: (key, params) => translate(key, initialTranslations, params),
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // On client mount, check localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scaniha-locale') as Locale
      if (stored && ALL_TRANSLATIONS[stored]) {
        setLocaleState(stored)
      }
    } catch (e) {}
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('scaniha-locale', newLocale)
      document.documentElement.lang = newLocale
      document.documentElement.dir = LOCALE_CONFIGS[newLocale].dir
    } catch (e) {}
  }, [])

  const currentTranslations = ALL_TRANSLATIONS[locale] || ALL_TRANSLATIONS[DEFAULT_LOCALE]

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, currentTranslations, params)
  }, [currentTranslations])

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dir: LOCALE_CONFIGS[locale].dir,
        translations: currentTranslations,
        setLocale,
        t,
      }}
    >
      <div dir={LOCALE_CONFIGS[locale].dir}>
        {children}
      </div>
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
