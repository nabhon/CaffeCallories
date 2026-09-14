'use client'

import React, { createContext, useContext, useSyncExternalStore, useCallback, useEffect } from 'react'
import type { Locale, TranslationDictionary } from './types'
import { en } from './dictionaries/en'
import { th } from './dictionaries/th'

interface LanguageContextValue {
  language: Locale
  setLanguage: (lang: Locale) => void
  toggleLanguage: () => void
  t: TranslationDictionary
}

const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  th,
}

const STORAGE_KEY = 'callories_language'

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Subscribers to language changes (within same window or cross-tab)
const subscribers = new Set<() => void>()

function notify() {
  subscribers.forEach((callback) => callback())
}

function getSystemLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const navLang = (
      navigator.language ||
      (navigator.languages && navigator.languages[0]) ||
      ''
    ).toLowerCase()
    return navLang.startsWith('th') ? 'th' : 'en'
  } catch {
    return 'en'
  }
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'th') {
      return stored
    }
    return getSystemLocale()
  } catch {
    return 'en'
  }
}

function subscribe(callback: () => void) {
  subscribers.add(callback)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback()
    }
  }

  window.addEventListener('storage', handleStorage)
  return () => {
    subscribers.delete(callback)
    window.removeEventListener('storage', handleStorage)
  }
}

function getServerSnapshot(): Locale {
  return 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Locale>(
    subscribe,
    getStoredLocale,
    getServerSnapshot
  )

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = useCallback((lang: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // LocalStorage error handling
    }
    notify()
  }, [])

  const toggleLanguage = useCallback(() => {
    const current = getStoredLocale()
    const nextLang: Locale = current === 'th' ? 'en' : 'th'
    setLanguage(nextLang)
  }, [setLanguage])

  const t = dictionaries[language] || en

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
