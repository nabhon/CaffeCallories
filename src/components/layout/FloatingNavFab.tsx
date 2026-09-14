'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Flame, CalendarDays, X, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FloatingNavFabProps {
  onOpenQuickAdd: () => void
}

export function FloatingNavFab({ onOpenQuickAdd }: FloatingNavFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useLanguage()
  const isToday = pathname === '/'
  const isCalendar = pathname.startsWith('/calendar')

  return (
    <div className="fixed bottom-8 right-8 z-50 hidden md:flex flex-col items-end gap-3 transform-gpu">
      {/* Expanded Speed Dial Menu Options */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Option 1: Quick Add Log */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-100 shadow-md backdrop-blur-xs select-none">
              {t.nav.logMealWorkout}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenQuickAdd()
              }}
              className="h-12 w-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Quick Add Entry"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </div>

          {/* Option 2: Today Dashboard */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-100 shadow-md backdrop-blur-xs select-none">
              {t.nav.todayDashboard}
            </span>
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isToday
                  ? 'bg-amber-500 text-white ring-4 ring-amber-500/20'
                  : 'bg-card text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-800 hover:border-amber-500/50'
              }`}
              aria-label="Today Dashboard"
            >
              <Flame className="h-5 w-5" />
            </Link>
          </div>

          {/* Option 3: Calendar History */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-100 shadow-md backdrop-blur-xs select-none">
              {t.nav.calendarHistory}
            </span>
            <Link
              href="/calendar"
              onClick={() => setIsOpen(false)}
              className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isCalendar
                  ? 'bg-amber-500 text-white ring-4 ring-amber-500/20'
                  : 'bg-card text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-800 hover:border-amber-500/50'
              }`}
              aria-label="Calendar History"
            >
              <CalendarDays className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open navigation actions'}
        className={`h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-background ${
          isOpen
            ? 'bg-stone-800 dark:bg-stone-700 rotate-90'
            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 stroke-[2.5]" />}
      </button>
    </div>
  )
}
