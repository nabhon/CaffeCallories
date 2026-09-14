'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  useCurrentUser,
  useUserProfile,
  useUserSettings,
  useTodayEntries,
  useTodayDayLog,
} from '@/lib/api/queries'
import { invalidateEntries } from '@/lib/api/mutations'
import dynamic from 'next/dynamic'
import { MobileShell } from '@/components/layout/MobileShell'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { FloatingNavFab } from '@/components/layout/FloatingNavFab'
import { RecommendationFab } from '@/components/recommendations/RecommendationFab'
import { TodayRecommendationCard } from '@/components/recommendations/TodayRecommendationCard'
import type { DayRecommendationsData } from '@/types/database'

const QuickAddDrawer = dynamic(
  () => import('@/components/entries/QuickAddDrawer').then((m) => m.QuickAddDrawer),
  { ssr: false }
)
import { TodaySkeleton } from '@/components/skeletons/TodaySkeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Utensils,
  Dumbbell,
  Trash2,
  Sparkles,
  Flame,
  Plus,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function TodayDashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Dynamic localized page title
  useEffect(() => {
    document.title = language === 'th' ? 'วันนี้ Callories' : 'Today Callories'
  }, [language])

  // Queries
  const { data: user, isLoading: userLoading, isFetched: userFetched } = useCurrentUser()
  const userId = user?.id

  // Redirect if unauthenticated
  useEffect(() => {
    if (userFetched && !user) {
      router.replace('/login')
    }
  }, [userFetched, user, router])

  const { data: userProfile, isLoading: profileLoading } = useUserProfile(userId)
  const {
    data: userSettings,
    isLoading: settingsLoading,
    isFetched: settingsFetched,
  } = useUserSettings(userId)

  // Redirect if user has not completed onboarding
  useEffect(() => {
    if (settingsFetched && !userSettings && user) {
      router.replace('/onboarding')
    }
  }, [settingsFetched, userSettings, user, router])

  const { data: todayEntries = [], isLoading: entriesLoading } = useTodayEntries(userId)

  // Local date formatted as YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  // Today's day log (including daily AI food recommendations)
  const { data: todayDayLog } = useTodayDayLog(userId)

  // Local recommendations state (provides immediate reactivity and offline/local fallback)
  const [localRecommendations, setLocalRecommendations] = useState<DayRecommendationsData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const today = `${y}-${m}-${day}`
      const cached = localStorage.getItem(`caffecallories_rec_${today}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  const handleRecommendationsUpdated = (data: DayRecommendationsData) => {
    setLocalRecommendations(data)
    try {
      localStorage.setItem(`caffecallories_rec_${todayDateStr}`, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  const recommendations = localRecommendations || (todayDayLog?.recommendations as unknown as DayRecommendationsData | null) || null

  const isLoading =
    userLoading || (!!userId && (profileLoading || settingsLoading || entriesLoading))

  // Real-time calculations
  const metrics = useMemo(() => {
    const dailyGoal = userSettings?.daily_calorie_goal || 2000
    const targetProtein = userSettings?.target_protein_g || 140
    const targetCarbs = userSettings?.target_carbs_g || 220
    const targetFat = userSettings?.target_fat_g || 65

    let intake = 0
    let burn = 0
    let protein = 0
    let carbs = 0
    let fat = 0

    todayEntries.forEach((entry) => {
      const entryType = entry.entry_type
      if (entryType === 'intake') {
        intake += entry.calories
        protein += Number(entry.protein_g) || 0
        carbs += Number(entry.carbs_g) || 0
        fat += Number(entry.fat_g) || 0
      } else if (entryType === 'burn') {
        burn += Math.abs(entry.calories)
      }
    })

    const netCalories = intake - burn
    const remaining = dailyGoal - netCalories
    const remainingCalories = remaining
    const isOver = remaining < 0

    // Calorie Gauge percentage (based on net calories vs goal)
    const gaugePercent = Math.min(Math.max((netCalories / dailyGoal) * 100, 0), 100)
    const progressPercent = Math.min(100, Math.max(0, Math.round((netCalories / dailyGoal) * 100)))

    // Macro percentages
    const proteinPercent = Math.min(Math.round((protein / targetProtein) * 100), 100)
    const carbsPercent = Math.min(Math.round((carbs / targetCarbs) * 100), 100)
    const fatPercent = Math.min(Math.round((fat / targetFat) * 100), 100)

    return {
      dailyGoal,
      targetProtein,
      targetCarbs,
      targetFat,
      intake,
      burn,
      totalIntake: intake,
      totalBurn: burn,
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      totalProtein: Math.round(protein),
      totalCarbs: Math.round(carbs),
      totalFat: Math.round(fat),
      netCalories,
      remaining,
      remainingCalories,
      isOver,
      gaugePercent,
      progressPercent,
      proteinPercent,
      carbsPercent,
      fatPercent,
    }
  }, [todayEntries, userSettings])

  // Delete entry and invalidate queries
  const handleDeleteEntry = async (id: string) => {
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('entries').delete().eq('id', id)
      if (error) {
        console.error('Failed to delete entry:', error)
      } else {
        await invalidateEntries(queryClient)
      }
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle new entry added from drawer
  const handleEntryAdded = async () => {
    await invalidateEntries(queryClient)
  }

  if (isLoading) {
    return <TodaySkeleton />
  }

  return (
    <MobileShell>
      {/* Sticky Header with Desktop Nav Links */}
      <Header
        userEmail={userProfile?.email}
        userName={userProfile?.name}
      />

      {/* Main Content Area - Expands to Responsive 2-Column Grid on Desktop */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column on Desktop: Calorie Hero & Macronutrients */}
          <div className="md:col-span-5 lg:col-span-5 space-y-6 md:sticky md:top-20">
            {/* HERO CALORIE BUDGET GAUGE */}
            <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/90 dark:bg-stone-900/90 p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
              {/* Subtle decorative glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-500" /> {t.dashboard.remainingToday}
                </span>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                >
                  {metrics.progressPercent}% {t.dashboard.ofGoal}
                </Badge>
              </div>

              {/* Remaining Counter */}
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                    metrics.remainingCalories < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-stone-900 dark:text-stone-100'
                  }`}
                >
                  {metrics.remainingCalories.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-stone-500">
                  {metrics.remainingCalories < 0 ? t.dashboard.kcalOver : t.dashboard.kcalLeft}
                </span>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-1.5">
                <Progress
                  value={metrics.progressPercent}
                  className="h-3 rounded-full bg-stone-200/80 dark:bg-stone-800"
                />
              </div>

              {/* Sub-Metric Summary Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-stone-400">{t.common.target}</div>
                  <div className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                    {metrics.dailyGoal.toLocaleString()}
                  </div>
                </div>
                <div className="text-center border-x border-stone-200/60 dark:border-stone-800/60">
                  <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                    {t.common.intake}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.totalIntake.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-orange-600 dark:text-orange-400">
                    {t.common.burn}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">
                    {metrics.totalBurn.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* MACRONUTRIENT DASHBOARD */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {t.dashboard.macronutrients}
                </span>
                <span className="text-[11px] text-stone-400">Daily targets</span>
              </div>

              <div className="space-y-3">
                {/* Protein (Red) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> {t.common.protein}
                    </span>
                    <span className="text-stone-600 dark:text-stone-400 font-medium">
                      {metrics.totalProtein}g / {metrics.targetProtein}g
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((metrics.totalProtein / metrics.targetProtein) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Carbs (Blue) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> {t.common.carbs}
                    </span>
                    <span className="text-stone-600 dark:text-stone-400 font-medium">
                      {metrics.totalCarbs}g / {metrics.targetCarbs}g
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((metrics.totalCarbs / metrics.targetCarbs) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Fat (Orange) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500" /> {t.common.fat}
                    </span>
                    <span className="text-stone-600 dark:text-stone-400 font-medium">
                      {metrics.totalFat}g / {metrics.targetFat}g
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((metrics.totalFat / metrics.targetFat) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column on Desktop: Today's Feed */}
          <div className="md:col-span-7 lg:col-span-7 space-y-4">
            {/* Daily AI Food Recommendations (Persists for the day when generated) */}
            <TodayRecommendationCard
              userId={userId}
              recommendations={recommendations}
              date={todayDateStr}
              dailyGoal={metrics.dailyGoal}
              netCalories={metrics.netCalories}
              remainingCalories={metrics.remainingCalories}
              targetProtein={metrics.targetProtein}
              currentProtein={metrics.protein}
              targetCarbs={metrics.targetCarbs}
              currentCarbs={metrics.carbs}
              targetFat={metrics.targetFat}
              currentFat={metrics.fat}
              onRecommendationsUpdated={handleRecommendationsUpdated}
            />

            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                {t.dashboard.todaysTimeline}
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {todayEntries.length} {language === 'th' ? 'รายการ' : 'items'}
                </Badge>
              </h2>
            </div>

            {/* Empty State */}
            {todayEntries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 p-8 sm:p-12 text-center space-y-3 bg-stone-50/50 dark:bg-stone-900/30">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    {t.dashboard.noEntriesYet}
                  </p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    {t.dashboard.startLogging}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> {t.dashboard.quickAdd}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayEntries.map((entry) => {
                  const timeString = new Date(entry.logged_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const isBurn = entry.entry_type === 'burn'

                  return (
                    <div
                      key={entry.id}
                      className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-4 flex items-center justify-between shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                    >
                      {/* Left: Icon & Description */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isBurn
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isBurn ? <Dumbbell className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {entry.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-400">
                            <span>{timeString}</span>
                            {!isBurn && (
                              <span className="text-[11px] text-stone-400 font-mono">
                                {Math.round(Number(entry.protein_g))}p • {Math.round(Number(entry.carbs_g))}c • {Math.round(Number(entry.fat_g))}f
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Calories & Delete Action */}
                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        <span
                          className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg ${
                            isBurn
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {Math.abs(entry.calories)} kcal
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                          aria-label="Delete entry"
                          className="text-stone-400 hover:text-red-500 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-red-500/10"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Mobile-Only Bottom Navigation (Hidden on md+ screens) */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Floating Action Button (Active across screens, especially replacing bottom bar on desktop) */}
      <FloatingNavFab onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* AI Food Recommendation Floating Action Button & Speech Bubble */}
      <RecommendationFab
        date={todayDateStr}
        dailyGoal={metrics.dailyGoal}
        netCalories={metrics.netCalories}
        remainingCalories={metrics.remainingCalories}
        targetProtein={metrics.targetProtein}
        currentProtein={metrics.protein}
        targetCarbs={metrics.targetCarbs}
        currentCarbs={metrics.carbs}
        targetFat={metrics.targetFat}
        currentFat={metrics.fat}
        onRecommendationsUpdated={handleRecommendationsUpdated}
      />

      {/* Quick Add Drawer (AI Powered) */}
      {userId && (
        <QuickAddDrawer
          isOpen={isQuickAddOpen}
          onOpenChange={setIsQuickAddOpen}
          userId={userId}
          onEntryAdded={handleEntryAdded}
        />
      )}
    </MobileShell>
  )
}
