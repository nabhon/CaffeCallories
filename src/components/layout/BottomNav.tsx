'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, CalendarDays, Plus } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface BottomNavProps {
  onOpenQuickAdd: () => void
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const isToday = pathname === '/'
  const isCalendar = pathname.startsWith('/calendar')

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto h-18 bg-background/95 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-around px-8 z-40 transform-gpu">
      {/* Today Tab */}
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer py-1 ${
          isToday
            ? 'text-amber-500 font-semibold'
            : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
        }`}
      >
        <Flame className={`h-5 w-5 ${isToday ? 'fill-amber-500/20' : ''}`} />
        <span className="text-[11px]">{t.nav.today}</span>
      </Link>

      {/* Floating Center Quick Add Action */}
      <button
        type="button"
        onClick={onOpenQuickAdd}
        aria-label="Quick log meal or workout"
        className="flex h-13 w-13 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 -translate-y-4 transition-all active:scale-95 cursor-pointer ring-4 ring-background"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Calendar Tab */}
      <Link
        href="/calendar"
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer py-1 ${
          isCalendar
            ? 'text-amber-500 font-semibold'
            : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
        }`}
      >
        <CalendarDays className="h-5 w-5" />
        <span className="text-[11px]">{t.nav.calendar}</span>
      </Link>
    </nav>
  )
}
