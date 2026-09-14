import React from 'react'
import { HeaderSkeleton } from './HeaderSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-28 md:pb-12 text-stone-900 dark:text-stone-100 flex flex-col items-center">
      <HeaderSkeleton />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Calendar Grid Column */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-5 sm:p-6 shadow-xs space-y-5">
              {/* Month Selector Bar */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>

              {/* Weekday Row */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex justify-center py-1">
                    <Skeleton className="h-4 w-7 rounded-md" />
                  </div>
                ))}
              </div>

              {/* 35 Calendar Day Cells (5 weeks x 7 days) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl sm:rounded-2xl border border-stone-100 dark:border-stone-800/60 p-1 sm:p-2 flex flex-col items-center justify-between"
                  >
                    <Skeleton className="h-3.5 w-4 rounded-sm" />
                    <Skeleton className="h-2 w-6 sm:w-8 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Day Summary Column */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-5">
              <div className="space-y-2 border-b border-stone-100 dark:border-stone-800/60 pb-4">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>

              {/* Intake / Burn breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 space-y-1.5">
                  <Skeleton className="h-3 w-12 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 space-y-1.5">
                  <Skeleton className="h-3 w-12 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>

              {/* Selected Day Entries List */}
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="space-y-1 min-w-0 flex-1">
                        <Skeleton className="h-3.5 w-24 rounded-md" />
                        <Skeleton className="h-2.5 w-16 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
