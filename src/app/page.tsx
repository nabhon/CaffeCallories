'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MobileShell } from '@/components/layout/MobileShell'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { FloatingNavFab } from '@/components/layout/FloatingNavFab'
import { QuickAddDrawer } from '@/components/entries/QuickAddDrawer'
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
import type { Entry, ProfileSettings, Profile } from '@/types/database'

export default function TodayDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [userSettings, setUserSettings] = useState<ProfileSettings | null>(null)
  const [todayEntries, setTodayEntries] = useState<Entry[]>([])
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch initial user, settings, and today's logs on mount
  useEffect(() => {
    document.title = 'Today Callories'
    let ignore = false

    async function loadData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace('/login')
          return
        }

        if (ignore) return
        setUserId(user.id)

        // 1. Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!ignore) setUserProfile(profile)

        // 2. Fetch Settings / Goals
        const { data: settings } = await supabase
          .from('profile_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!settings) {
          // First-time user without completed onboarding
          router.replace('/onboarding')
          return
        }

        if (!ignore) setUserSettings(settings)

        // 3. Fetch Today's Entries
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

        const { data: entries, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', startOfDay)
          .lte('logged_at', endOfDay)
          .order('logged_at', { ascending: false })

        if (!ignore && !entriesError && entries) {
          setTodayEntries(entries)
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [router])

  // Real-time calculations
  const metrics = useMemo(() => {
    const dailyGoal = userSettings?.daily_calorie_goal || 2000
    const targetProtein = userSettings?.target_protein_g || 140
    const targetCarbs = userSettings?.target_carbs_g || 220
    const targetFat = userSettings?.target_fat_g || 65

    let totalIntake = 0
    let totalBurn = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    todayEntries.forEach((entry) => {
      if (entry.entry_type === 'burn') {
        totalBurn += Math.abs(entry.calories)
      } else {
        totalIntake += entry.calories
        totalProtein += Number(entry.protein_g) || 0
        totalCarbs += Number(entry.carbs_g) || 0
        totalFat += Number(entry.fat_g) || 0
      }
    })

    const netCalories = totalIntake - totalBurn
    const remainingCalories = dailyGoal - netCalories
    const progressPercent = Math.min(100, Math.max(0, Math.round((netCalories / dailyGoal) * 100)))

    return {
      dailyGoal,
      totalIntake,
      totalBurn,
      netCalories,
      remainingCalories,
      progressPercent,
      targetProtein,
      targetCarbs,
      targetFat,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
    }
  }, [userSettings, todayEntries])

  // Handle entry delete
  const handleDeleteEntry = async (id: string) => {
    setDeletingId(id)
    const previousEntries = [...todayEntries]
    setTodayEntries((prev) => prev.filter((item) => item.id !== id))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('entries').delete().eq('id', id)
      if (error) {
        setTodayEntries(previousEntries)
        console.error('Failed to delete entry:', error)
      }
    } catch {
      setTodayEntries(previousEntries)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle new entry added from drawer
  const handleEntryAdded = (newEntry: Entry) => {
    setTodayEntries((prev) => [newEntry, ...prev])
  }

  if (loading) {
    return (
      <MobileShell>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs text-stone-400">Loading your calorie budget...</p>
        </div>
      </MobileShell>
    )
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
                  <Flame className="h-4 w-4 text-amber-500" /> Remaining Today
                </span>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                >
                  {metrics.progressPercent}% of Goal
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
                  {metrics.remainingCalories < 0 ? 'kcal over' : 'kcal left'}
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
                  <div className="text-[10px] uppercase font-semibold text-stone-400">Target</div>
                  <div className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                    {metrics.dailyGoal.toLocaleString()}
                  </div>
                </div>
                <div className="text-center border-x border-stone-200/60 dark:border-stone-800/60">
                  <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                    Intake
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.totalIntake.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-orange-600 dark:text-orange-400">
                    Burn
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
                  Macronutrients
                </span>
                <span className="text-[11px] text-stone-400">Daily targets</span>
              </div>

              <div className="space-y-3">
                {/* Protein (Red) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Protein
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
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Carbs
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
                      <span className="h-2 w-2 rounded-full bg-orange-500" /> Fat
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
          <div className="md:col-span-7 lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                Today&apos;s Logs
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {todayEntries.length} items
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
                    No logs recorded today
                  </p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Use the floating action button below to log meals or workouts in Thai or English.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Log first entry
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
