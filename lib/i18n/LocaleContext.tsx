'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_CONFIGS, type Locale } from './config'

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

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  translations: {},
  setLocale: () => {},
  t: (key: string) => key,
})

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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [translations, setTranslations] = useState<Translations>({})

  useEffect(() => {
    const stored = localStorage.getItem('scaniha-locale') as Locale | null
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocaleState(stored)
      loadTranslations(stored)
    } else {
      const browserLang = navigator.language.slice(0, 2).toLowerCase()
      const detected = SUPPORTED_LOCALES.includes(browserLang as Locale)
        ? (browserLang as Locale)
        : DEFAULT_LOCALE
      setLocaleState(detected)
      loadTranslations(detected)
    }
  }, [])

  const loadTranslations = async (loc: Locale) => {
    try {
      const res = await fetch(`/locales/${loc}/common.json`)
      const data = await res.json()
      setTranslations(data)
    } catch {
      const res = await fetch(`/locales/${DEFAULT_LOCALE}/common.json`)
      const data = await res.json()
      setTranslations(data)
    }
  }

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('scaniha-locale', newLocale)
    document.documentElement.lang = newLocale
    document.documentElement.dir = LOCALE_CONFIGS[newLocale].dir
    loadTranslations(newLocale)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const text = resolveNested(translations, key)
      return interpolate(text, params)
    },
    [translations]
  )

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dir: LOCALE_CONFIGS[locale].dir,
        translations,
        setLocale,
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
