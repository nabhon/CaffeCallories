'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const { language, toggleLanguage, t } = useLanguage()

  // Dynamic localized page title
  useEffect(() => {
    document.title = t.auth.pageTitle
  }, [t.auth.pageTitle])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
      }
    } catch {
      setErrorMessage(t.auth.unexpectedError)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Language Switcher in Top-Right Corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={t.header.switchLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-500/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer shadow-xs"
        >
          <Globe className="h-3.5 w-3.5 text-amber-500" />
          <span>{language === 'th' ? 'ไทย' : 'EN'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Brand Logo Only */}
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Callories Logo"
            width={88}
            height={88}
            className="h-20 w-20 sm:h-22 sm:w-22 rounded-2xl object-contain drop-shadow-sm"
            priority
          />
        </div>

        {/* Error alerts */}
        {(errorMessage || errorParam) && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-600 dark:text-red-400 text-left">
            {errorMessage || t.auth.authFailed}
          </div>
        )}

        {/* Sign In Card */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-6 shadow-xs space-y-5">
          <div className="space-y-1 text-left">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.auth.welcomeTitle}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {t.auth.welcomeSubtitle}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-3 font-semibold text-xs sm:text-sm cursor-pointer bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-xs active:scale-95 transition-all"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>
              {loading ? t.auth.connectingGoogle : t.auth.continueWithGoogle}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
