'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MobileShell } from '@/components/layout/MobileShell'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { QuickAddDrawer } from '@/components/entries/QuickAddDrawer'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Dumbbell,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react'
import type { Entry, Profile } from '@/types/database'

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CalendarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [monthEntries, setMonthEntries] = useState<Entry[]>([])
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Load user session and month's entries
  useEffect(() => {
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

        // Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!ignore) setUserProfile(profile)

        // Month boundary timestamps
        const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0).toISOString()
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString()

        const { data: entries, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', startOfMonth)
          .lte('logged_at', endOfMonth)
          .order('logged_at', { ascending: false })

        if (!ignore && !entriesError && entries) {
          setMonthEntries(entries)
        }
      } catch (err) {
        console.error('Error loading calendar data:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [currentYear, currentMonth, router])

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
  const selectedDayData = entriesByDate[selectedDateKey] || {
    entries: [],
    netCalories: 0,
    totalIntake: 0,
    totalBurn: 0,
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
    const previousEntries = [...monthEntries]
    setMonthEntries((prev) => prev.filter((item) => item.id !== id))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('entries').delete().eq('id', id)
      if (error) {
        setMonthEntries(previousEntries)
        console.error('Failed to delete entry:', error)
      }
    } catch {
      setMonthEntries(previousEntries)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle new entry added from drawer
  const handleEntryAdded = (newEntry: Entry) => {
    setMonthEntries((prev) => [newEntry, ...prev])
  }

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const selectedDateFormatted = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const todayKey = formatLocalDateKey(new Date())

  if (loading) {
    return (
      <MobileShell>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs text-stone-400">Loading your history...</p>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell>
      {/* Sticky Header */}
      <Header userEmail={userProfile?.email} userName={userProfile?.name} />

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-4 pb-28 overflow-y-auto">
        {/* Month Navigation & Title */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {monthName}
            </h1>
          </div>
          <div className="flex items-center gap-1">
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
        <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/90 dark:bg-stone-900/90 p-3.5 shadow-xs space-y-2">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold text-stone-400 py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              if (!item.date) {
                return <div key={item.dateKey} className="h-13 rounded-xl" />
              }

              const isSelected = item.dateKey === selectedDateKey
              const isToday = item.dateKey === todayKey
              const dayData = entriesByDate[item.dateKey]
              const hasEntries = dayData && dayData.entries.length > 0

              return (
                <button
                  key={item.dateKey}
                  type="button"
                  onClick={() => setSelectedDate(item.date!)}
                  className={`h-13 rounded-xl flex flex-col items-center justify-between p-1 transition-all cursor-pointer text-center relative ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-bold ring-2 ring-amber-500/40'
                      : isToday
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-semibold'
                      : 'hover:bg-stone-200/60 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {/* Day Number */}
                  <span className="text-xs">{item.date.getDate()}</span>

                  {/* Net Calorie Badge */}
                  {hasEntries ? (
                    <span
                      className={`text-[9px] font-bold tracking-tight px-1 rounded-sm leading-tight truncate w-full ${
                        isSelected
                          ? 'text-white/95'
                          : dayData.netCalories < 0
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {dayData.netCalories > 0 ? `+${dayData.netCalories}` : dayData.netCalories}
                    </span>
                  ) : (
                    <span className="h-2" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* SELECTED DAY DETAIL INSPECTOR */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800/60 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-amber-500" />
                {selectedDateFormatted}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span>Food: +{selectedDayData.totalIntake} kcal</span>
                <span>•</span>
                <span>Burn: -{selectedDayData.totalBurn} kcal</span>
              </div>
            </div>

            {/* Net Total for Day */}
            <Badge
              variant="outline"
              className={`text-xs font-bold ${
                selectedDayData.netCalories < 0
                  ? 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                  : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
              }`}
            >
              Net: {selectedDayData.netCalories > 0 ? `+${selectedDayData.netCalories}` : selectedDayData.netCalories} kcal
            </Badge>
          </div>

          {/* Itemized List for Selected Day */}
          {selectedDayData.entries.length === 0 ? (
            <div className="py-6 text-center space-y-1.5">
              <p className="text-xs font-medium text-stone-500">
                No entries recorded for this date
              </p>
              <p className="text-[11px] text-stone-400">
                Tap the center + button below to log food or workouts.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {selectedDayData.entries.map((entry) => {
                const timeString = new Date(entry.logged_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const isBurn = entry.entry_type === 'burn'

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isBurn
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isBurn ? <Dumbbell className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {entry.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400">
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
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                          isBurn
                            ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        }`}
                      >
                        {isBurn ? `-${Math.abs(entry.calories)}` : `+${entry.calories}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        aria-label="Remove entry"
                        className="text-stone-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

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
