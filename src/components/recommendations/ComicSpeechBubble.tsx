'use client'

import React from 'react'
import { Sparkles, X, Loader2, ChefHat } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface ComicSpeechBubbleProps {
  isOpen: boolean
  onClose: () => void
  onAskRecommendation: () => void
  isLoading: boolean
  remainingCalories: number
  remainingProtein: number
}

export function ComicSpeechBubble({
  isOpen,
  onClose,
  onAskRecommendation,
  isLoading,
  remainingCalories,
  remainingProtein,
}: ComicSpeechBubbleProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  const calText = t.recommendation.bubbleRemainingCal.replace(
    '{cal}',
    Math.max(0, remainingCalories).toLocaleString()
  )
  const proteinText = t.recommendation.bubbleRemainingProtein.replace(
    '{p}',
    Math.max(0, remainingProtein).toString()
  )

  return (
    <div className="absolute bottom-full right-0 mb-4.5 z-50 w-80 sm:w-88 animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-200 origin-bottom-right">
      {/* Clean Comic Speech Bubble Container */}
      <div className="relative bg-white dark:bg-stone-900 border-2 border-amber-500 rounded-3xl p-4.5 shadow-2xl shadow-amber-500/10 select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ChefHat className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              {t.recommendation.bubbleTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close speech bubble"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="py-3">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
            {t.recommendation.bubbleQuestion}
          </p>

          {/* Context Metrics */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-300">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              🔥 {calText}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              💪 {proteinText}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAskRecommendation}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.recommendation.askingButton}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{t.recommendation.askButton}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-1 text-center text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors cursor-pointer"
          >
            {t.recommendation.closeButton}
          </button>
        </div>

        {/* SVG Speech Bubble Pointer Tail (Seamless, points down to FAB) */}
        <svg
          className="absolute -bottom-[13px] right-6 w-5 h-3.5"
          viewBox="0 0 20 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 0 0 L 14 13 L 20 0"
            className="fill-white dark:fill-stone-900 stroke-amber-500"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Overwrite top border seam to seamlessly blend into bubble body */}
          <line
            x1="1"
            y1="0"
            x2="19"
            y2="0"
            className="stroke-white dark:stroke-stone-900"
            strokeWidth="4"
          />
        </svg>
      </div>
    </div>
  )
}
