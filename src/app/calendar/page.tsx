'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  useCurrentUser,
  useUserProfile,
  useUserSettings,
  useMonthEntries,
  useMonthDayLogs,
} from '@/lib/api/queries'
import { invalidateEntries, updateDayLogGoal } from '@/lib/api/mutations'
import { MobileShell } from '@/components/layout/MobileShell'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { FloatingNavFab } from '@/components/layout/FloatingNavFab'
import { QuickAddDrawer } from '@/components/entries/QuickAddDrawer'
import { CalendarSkeleton } from '@/components/skeletons/CalendarSkeleton'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Dumbbell,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Pencil,
  Check,
  X,
  Target,
} from 'lucide-react'
import type { Entry, DayLog } from '@/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type DayHealthStatus = 'none' | 'on_target' | 'over_budget' | 'under_eating'

function getDayHealthStatus(hasEntries: boolean, sumTotal: number, goal: number): DayHealthStatus {
  if (!hasEntries) return 'none'
  if (sumTotal > goal) return 'over_budget'
  if (sumTotal < 0.3 * goal) return 'under_eating'
  return 'on_target'
}

export default function CalendarPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Day goal inline editing state
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [editingGoalValue, setEditingGoalValue] = useState<number>(2000)
  const [isSavingGoal, setIsSavingGoal] = useState(false)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Dynamic localized page title
  useEffect(() => {
    document.title = language === 'th' ? 'ปฏิทิน Callories' : 'Calendar Callories'
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
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings(userId)
  const { data: monthEntries = [], isLoading: monthLoading } = useMonthEntries(
    userId,
    currentYear,
    currentMonth
  )
  const { data: monthDayLogs = [], isLoading: dayLogsLoading } = useMonthDayLogs(
    userId,
    currentYear,
    currentMonth
  )

  const isLoading =
    userLoading ||
    (!!userId && (profileLoading || settingsLoading || monthLoading || dayLogsLoading))

  const defaultCalorieGoal = userSettings?.daily_calorie_goal ?? 2000

  // Index day_logs by YYYY-MM-DD
  const dayLogsByDate = useMemo(() => {
    const map: Record<string, DayLog> = {}
    monthDayLogs.forEach((dl) => {
      map[dl.date] = dl
    })
    return map
  }, [monthDayLogs])

  // Aggregate entries by local date string (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map: Record<string, { entries: Entry[]; netCalories: number; totalIntake: number; totalBurn: number }> = {}

    monthEntries.forEach((entry) => {
      const dateKey = formatLocalDateKey(new Date(entry.logged_at))
      if (!map[dateKey]) {
        map[dateKey] = { entries: [], netCalories: 0, totalIntake: 0, totalBurn: 0 }
      }
      map[dateKey].entries.push(entry)
      if (entry.entry_type === 'burn') {
        const burn = Math.abs(entry.calories)
        map[dateKey].totalBurn += burn
        map[dateKey].netCalories -= burn
      } else {
        map[dateKey].totalIntake += entry.calories
        map[dateKey].netCalories += entry.calories
      }
    })

    return map
  }, [monthEntries])

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sun, 1 = Mon...
    const days: Array<{ date: Date | null; isCurrentMonth: boolean; dateKey: string }> = []

    // Empty lead slots before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ date: null, isCurrentMonth: false, dateKey: `empty-lead-${i}` })
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      days.push({
        date,
        isCurrentMonth: true,
        dateKey: formatLocalDateKey(date),
      })
    }

    return days
  }, [currentYear, currentMonth])

  // Selected date details
  const selectedDateKey = formatLocalDateKey(selectedDate)
  const selectedDayLog = dayLogsByDate[selectedDateKey]
  const selectedDayGoal = selectedDayLog?.calorie_goal ?? defaultCalorieGoal
  const selectedDayData = entriesByDate[selectedDateKey] || {
    entries: [],
    netCalories: 0,
    totalIntake: 0,
    totalBurn: 0,
  }
  const selectedHasEntries =
    selectedDayData.entries.length > 0 ||
    (selectedDayLog && (selectedDayLog.total_intake > 0 || selectedDayLog.total_burn > 0))
  const selectedSumTotal = selectedDayData.netCalories
  const selectedStatus = getDayHealthStatus(Boolean(selectedHasEntries), selectedSumTotal, selectedDayGoal)

  // Reset/sync inline editing handlers
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setIsEditingGoal(false)
  }

  const handleStartEditGoal = () => {
    setEditingGoalValue(selectedDayGoal)
    setIsEditingGoal(true)
  }

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false)
    setEditingGoalValue(selectedDayGoal)
  }

  // Save goal for selected date
  const handleSaveGoal = async () => {
    if (!userId || !editingGoalValue || editingGoalValue <= 0) return
    setIsSavingGoal(true)
    try {
      await updateDayLogGoal(queryClient, {
        userId,
        date: selectedDateKey,
        calorieGoal: editingGoalValue,
      })
      setIsEditingGoal(false)
    } catch (err) {
      console.error('Failed to update day goal:', err)
    } finally {
      setIsSavingGoal(false)
    }
  }

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  // Handle entry delete
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

  const monthName = currentDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })

  const selectedDateFormatted = selectedDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const todayKey = formatLocalDateKey(new Date())

  if (isLoading) {
    return <CalendarSkeleton />
  }

  return (
    <MobileShell>
      {/* Sticky Header */}
      <Header userEmail={userProfile?.email} userName={userProfile?.name} />

      {/* Main Content Area - Expands to Responsive 2-Column Grid on Desktop */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column on Desktop: Monthly Calendar Grid & Controls */}
            <div className="md:col-span-7 lg:col-span-7 space-y-4">
              {/* Month Navigation & Title */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                    {monthName}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      setCurrentDate(today)
                      handleSelectDate(today)
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-all cursor-pointer"
                  >
                    {t.common.today}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* MONTHLY CALENDAR GRID */}
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/90 dark:bg-stone-900/90 p-3.5 sm:p-5 shadow-xs space-y-3">
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 text-center">
                  {t.calendar.daysShort.map((day, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold text-stone-400 py-1"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((item) => {
                    if (!item.date) {
                      return (
                        <div
                          key={item.dateKey}
                          className="min-h-[72px] sm:min-h-[82px] md:min-h-[92px] rounded-2xl"
                        />
                      )
                    }

                    const isSelected = item.dateKey === selectedDateKey
                    const isToday = item.dateKey === todayKey
                    const dayData = entriesByDate[item.dateKey]
                    const dayLog = dayLogsByDate[item.dateKey]
                    const dayGoal = dayLog?.calorie_goal ?? defaultCalorieGoal
                    const hasEntries =
                      (dayData && dayData.entries.length > 0) ||
                      (dayLog && (dayLog.total_intake > 0 || dayLog.total_burn > 0))
                    const sumTotal = dayData ? dayData.netCalories : (dayLog ? dayLog.net_calories : 0)
                    const status = getDayHealthStatus(Boolean(hasEntries), sumTotal, dayGoal)

                    let cellBgClass = ''
                    let dayNumClass = ''
                    let sumTotalClass = ''
                    let dividerClass = ''
                    let goalClass = ''

                    if (isSelected) {
                      if (status === 'over_budget' || status === 'under_eating') {
                        cellBgClass =
                          'bg-red-600 text-white shadow-md shadow-red-600/25 ring-2 ring-red-500/50'
                      } else if (status === 'on_target') {
                        cellBgClass =
                          'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/50'
                      } else {
                        cellBgClass =
                          'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/40'
                      }
                      dayNumClass = 'text-white'
                      sumTotalClass = 'text-white font-bold'
                      dividerClass = 'bg-white/40'
                      goalClass = 'text-white/80'
                    } else {
                      if (status === 'over_budget' || status === 'under_eating') {
                        cellBgClass =
                          'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 hover:bg-red-500/20'
                        dayNumClass = 'text-red-700 dark:text-red-300 font-bold'
                        sumTotalClass = 'text-red-700 dark:text-red-300 font-bold'
                        dividerClass = 'bg-red-500/30'
                        goalClass = 'text-red-600/80 dark:text-red-400/80'
                      } else if (status === 'on_target') {
                        cellBgClass =
                          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                        dayNumClass = 'text-emerald-700 dark:text-emerald-300 font-bold'
                        sumTotalClass = 'text-emerald-700 dark:text-emerald-300 font-bold'
                        dividerClass = 'bg-emerald-500/30'
                        goalClass = 'text-emerald-600/80 dark:text-emerald-400/80'
                      } else if (isToday) {
                        cellBgClass =
                          'bg-amber-500/10 text-stone-700 dark:text-stone-300 border border-amber-500/40 font-semibold'
                        dayNumClass = 'text-amber-600 dark:text-amber-400 font-bold'
                        sumTotalClass = 'text-stone-400 dark:text-stone-500'
                        dividerClass = 'bg-stone-300 dark:bg-stone-700'
                        goalClass = 'text-stone-500 dark:text-stone-400'
                      } else {
                        cellBgClass =
                          'hover:bg-stone-200/60 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300 border border-stone-200/40 dark:border-stone-800/40'
                        dayNumClass = 'text-stone-600 dark:text-stone-400'
                        sumTotalClass = 'text-stone-400 dark:text-stone-500'
                        dividerClass = 'bg-stone-300 dark:bg-stone-700'
                        goalClass = 'text-stone-400 dark:text-stone-500'
                      }
                    }

                    return (
                      <button
                        key={item.dateKey}
                        type="button"
                        onClick={() => handleSelectDate(item.date!)}
                        className={`min-h-[72px] sm:min-h-[82px] md:min-h-[92px] rounded-2xl flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all cursor-pointer text-center relative ${cellBgClass}`}
                      >
                        {/* Day Number Row */}
                        <div className="w-full flex items-center justify-between px-0.5">
                          <span className={`text-[11px] sm:text-xs font-semibold ${dayNumClass}`}>
                            {item.date.getDate()}
                          </span>
                          {isToday && !isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                        </div>

                        {/* Stacked Sum Total on top, line below, Goal number below (only if entries exist) */}
                        {hasEntries ? (
                          <div className="w-full flex flex-col items-center justify-center my-auto py-0.5">
                            {/* Sum total on top */}
                            <span
                              className={`text-[10px] sm:text-xs tracking-tight truncate max-w-full ${sumTotalClass}`}
                            >
                              {Math.abs(sumTotal)}
                            </span>

                            {/* Separator line */}
                            <div className={`w-5 sm:w-7 h-[1px] my-0.5 sm:my-1 ${dividerClass}`} />

                            {/* Goal number below */}
                            <span
                              className={`text-[9px] sm:text-[10px] tracking-tight truncate max-w-full ${goalClass}`}
                            >
                              {dayGoal}
                            </span>
                          </div>
                        ) : (
                          <div className="my-auto" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Status Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-stone-200/50 dark:border-stone-800/50 text-[11px] text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{t.calendar.onTarget} (30%–100%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>{t.calendar.overBudget} / {t.calendar.underEating}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column on Desktop: Selected Day Detail Inspector */}
            <div className="md:col-span-5 lg:col-span-5 space-y-4 md:sticky md:top-20">
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 space-y-4 shadow-xs">
                {/* Header with Selected Date & Status Badge */}
                <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800/60 pb-3.5">
                  <div className="space-y-1">
                    <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4 text-amber-500" />
                      {selectedDateFormatted}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span>{t.common.intake}: {selectedDayData.totalIntake} kcal</span>
                      <span>•</span>
                      <span>{t.common.burn}: {selectedDayData.totalBurn} kcal</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {selectedStatus === 'over_budget' ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10 font-bold text-xs px-2.5 py-1"
                    >
                      {t.calendar.overBudget}
                    </Badge>
                  ) : selectedStatus === 'under_eating' ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10 font-bold text-xs px-2.5 py-1"
                    >
                      {t.calendar.underEating}
                    </Badge>
                  ) : selectedStatus === 'on_target' ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold text-xs px-2.5 py-1"
                    >
                      {t.calendar.onTarget}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-stone-200 dark:border-stone-800 text-stone-500 font-medium text-xs px-2.5 py-1"
                    >
                      {t.common.net}: 0 kcal
                    </Badge>
                  )}
                </div>

                {/* Day Goal & Day Sum Total Overview with Inline Goal Editor */}
                <div className="rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      {t.calendar.goalForDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500 shrink-0" />
                      {isEditingGoal ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editingGoalValue}
                            onChange={(e) => setEditingGoalValue(Math.max(100, parseInt(e.target.value) || 0))}
                            className="w-24 px-2 py-1 text-sm font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            min="500"
                            max="10000"
                            step="50"
                            disabled={isSavingGoal}
                          />
                          <span className="text-xs text-stone-400">kcal</span>
                          <button
                            type="button"
                            onClick={handleSaveGoal}
                            disabled={isSavingGoal}
                            aria-label={t.calendar.saveDayGoal}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSavingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditGoal}
                            disabled={isSavingGoal}
                            aria-label={t.calendar.cancel}
                            className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                            {selectedDayGoal} <span className="text-xs font-normal text-stone-400">kcal</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleStartEditGoal}
                            aria-label={t.calendar.editDayGoal}
                            className="p-1 text-stone-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
                            title={t.calendar.editDayGoal}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Net Calories vs Goal */}
                  <div className="text-right space-y-0.5">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      {t.calendar.daySumTotal}
                    </span>
                    <div
                      className={`text-sm sm:text-base font-bold ${
                        selectedStatus === 'over_budget' || selectedStatus === 'under_eating'
                          ? 'text-red-600 dark:text-red-400'
                          : selectedStatus === 'on_target'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {Math.abs(selectedSumTotal)}{' '}
                      <span className="text-xs font-normal text-stone-400">kcal</span>
                    </div>
                  </div>
                </div>

                {/* Itemized List for Selected Day */}
                {selectedDayData.entries.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs sm:text-sm font-medium text-stone-500">
                      {t.calendar.noEntriesForDay}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddOpen(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t.calendar.logAnEntry}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {selectedDayData.entries.map((entry) => {
                      const timeString = new Date(entry.logged_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      const isBurn = entry.entry_type === 'burn'

                      return (
                        <div
                          key={entry.id}
                          className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 p-3.5 flex items-center justify-between hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                isBurn
                                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isBurn ? <Dumbbell className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {entry.name}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                                <span>{timeString}</span>
                                {!isBurn && (
                                  <span className="font-mono">
                                    {Math.round(Number(entry.protein_g))}p • {Math.round(Number(entry.carbs_g))}c • {Math.round(Number(entry.fat_g))}f
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                                isBurn
                                  ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10'
                                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              }`}
                            >
                              {Math.abs(entry.calories)} kcal
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              aria-label="Remove entry"
                              className="text-stone-400 hover:text-red-500 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-red-500/10"
                            >
                              {deletingId === entry.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
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
        </div>
      </main>

      {/* Floating Bottom Navigation (Mobile Only) */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Floating Action Button (Active on desktop) */}
      <FloatingNavFab onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Quick Add Drawer */}
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
