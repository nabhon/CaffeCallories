'use client'

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChefHat,
  Check,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { quickLogRecommendationEntry } from '@/lib/api/mutations'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { DayRecommendationsData, FoodRecommendationItem } from '@/types/database'

interface TodayRecommendationCardProps {
  userId: string | null | undefined
  recommendations: DayRecommendationsData | null | undefined
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

export function TodayRecommendationCard({
  userId,
  recommendations,
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
}: TodayRecommendationCardProps) {
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!recommendations || !recommendations.items || recommendations.items.length === 0) {
    return null
  }

  const handleQuickLog = async (item: FoodRecommendationItem) => {
    if (!userId || loggingId) return
    setLoggingId(item.id)

    try {
      await quickLogRecommendationEntry(queryClient, {
        userId,
        item,
      })

      setLoggedIds((prev) => new Set(prev).add(item.id))
      setTimeout(() => {
        setLoggedIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }, 3000)
    } catch (error) {
      console.error('Failed to log recommended item:', error)
      alert(t.quickAdd.saveFailed)
    } finally {
      setLoggingId(null)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const remainingProtein = Math.max(0, targetProtein - currentProtein)
      const remainingCarbs = Math.max(0, targetCarbs - currentCarbs)
      const remainingFat = Math.max(0, targetFat - currentFat)

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
        throw new Error('Failed to refresh recommendations')
      }

      const data: DayRecommendationsData = await response.json()
      if (onRecommendationsUpdated) {
        onRecommendationsUpdated(data)
      }

      await queryClient.invalidateQueries({ queryKey: ['day_logs'] })
    } catch (error) {
      console.error('Error refreshing recommendations:', error)
      alert(t.recommendation.serviceUnavailable)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl p-5 border-2 border-amber-500/30 dark:border-amber-500/30 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-tight">
              {t.recommendation.cardTitle}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {t.recommendation.cardSubtitle}
            </p>
          </div>
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          title={t.recommendation.refreshButton}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t.recommendation.refreshButton}</span>
        </button>
      </div>

      {/* Recommended Food Items */}
      <div className="grid grid-cols-1 gap-3">
        {recommendations.items.map((item) => {
          const isLogging = loggingId === item.id
          const isLogged = loggedIds.has(item.id)

          return (
            <div
              key={item.id}
              className="bg-stone-50/80 dark:bg-stone-900/40 rounded-xl p-3.5 border border-stone-200/70 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-amber-500/40"
            >
              {/* Left Details */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    {item.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5"
                  >
                    {item.calories} kcal
                  </Badge>
                </div>

                {/* Macros */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {t.common.protein}:
                    </span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-medium">
                      {item.protein_g}g
                    </span>
                  </span>
                  <span className="text-stone-300 dark:text-stone-700">•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {t.common.carbs}:
                    </span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-medium">
                      {item.carbs_g}g
                    </span>
                  </span>
                  <span className="text-stone-300 dark:text-stone-700">•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {t.common.fat}:
                    </span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-medium">
                      {item.fat_g}g
                    </span>
                  </span>
                </div>

                {/* Why it fits reason */}
                {item.reason && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 italic pt-0.5">
                    💡 {item.reason}
                  </p>
                )}
              </div>

              {/* Right Quick Log Action */}
              <div className="shrink-0 flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleQuickLog(item)}
                  disabled={isLogging || isLogged}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLogged
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-500/20'
                  } disabled:opacity-75 disabled:cursor-not-allowed`}
                >
                  {isLogging ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t.recommendation.logging}</span>
                    </>
                  ) : isLogged ? (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>{t.recommendation.loggedSuccess}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>{t.recommendation.quickLog}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
