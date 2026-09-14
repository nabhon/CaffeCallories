'use client'

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChefHat, Sparkles } from 'lucide-react'
import { ComicSpeechBubble } from './ComicSpeechBubble'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { DayRecommendationsData } from '@/types/database'

interface RecommendationFabProps {
  date: string
  dailyGoal: number
  netCalories: number
  remainingCalories: number
  targetProtein: number
  currentProtein: number
  targetCarbs: number
  currentCarbs: number
  targetFat: number
  currentFat: number
  onRecommendationsUpdated?: (data: DayRecommendationsData) => void
}

export function RecommendationFab({
  date,
  dailyGoal,
  netCalories,
  remainingCalories,
  targetProtein,
  currentProtein,
  targetCarbs,
  currentCarbs,
  targetFat,
  currentFat,
  onRecommendationsUpdated,
}: RecommendationFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()

  const remainingProtein = Math.max(0, targetProtein - currentProtein)
  const remainingCarbs = Math.max(0, targetCarbs - currentCarbs)
  const remainingFat = Math.max(0, targetFat - currentFat)

  const handleAskRecommendation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          calorieGoal: dailyGoal,
          netCalories,
          remainingCalories,
          targetProtein,
          currentProtein,
          remainingProtein,
          targetCarbs,
          currentCarbs,
          remainingCarbs,
          targetFat,
          currentFat,
          remainingFat,
          language,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data: DayRecommendationsData = await response.json()

      if (onRecommendationsUpdated) {
        onRecommendationsUpdated(data)
      }

      // Invalidate day_logs so Today dashboard immediately renders the new recommendations
      await queryClient.invalidateQueries({ queryKey: ['day_logs'] })

      // Close the speech bubble
      setIsOpen(false)
    } catch (error) {
      console.error('Error requesting recommendations:', error)
      alert(t.recommendation.serviceUnavailable)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-22 right-4 md:bottom-24 md:right-8 z-40 flex flex-col items-end transform-gpu">
      {/* Speech Bubble Popup */}
      <ComicSpeechBubble
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAskRecommendation={handleAskRecommendation}
        isLoading={isLoading}
        remainingCalories={remainingCalories}
        remainingProtein={remainingProtein}
      />

      {/* Main Floating Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t.recommendation.fabTooltip}
          className="relative h-13 w-13 md:h-14 md:w-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 border-2 border-amber-400 dark:border-amber-400 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-background"
        >
          <ChefHat className="h-6 w-6" />

          {/* Sparkle Badge */}
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-600 text-white flex items-center justify-center border border-white dark:border-stone-900 shadow-xs">
            <Sparkles className="h-3 w-3 fill-current" />
          </span>
        </button>

        {/* Hover Tooltip (Desktop) */}
        {!isOpen && (
          <span className="hidden md:group-hover:block absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-md whitespace-nowrap pointer-events-none transition-opacity">
            {t.recommendation.fabTooltip}
          </span>
        )}
      </div>
    </div>
  )
}
