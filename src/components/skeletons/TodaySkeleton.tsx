import React from 'react'
import { HeaderSkeleton } from './HeaderSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export function TodaySkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-28 md:pb-12 text-stone-900 dark:text-stone-100 flex flex-col items-center">
      <HeaderSkeleton />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Dashboard Column */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            {/* Calorie Target Gauge Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs p-6 shadow-xs flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              {/* Center Circular Gauge Placeholder */}
              <div className="relative my-4 flex items-center justify-center">
                <Skeleton className="h-44 w-44 sm:h-52 sm:w-52 rounded-full" />
              </div>

              {/* Intake & Burn summary strip */}
              <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-14 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-14 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </div>

            {/* Macro Split Grid (Protein, Carbs, Fat) */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-12 rounded-md" />
                    <Skeleton className="h-3 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>

            {/* Timeline Entries Skeleton */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>

              {/* 3 Entry Card Skeletons */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-stone-200/70 dark:border-stone-800/70 bg-white/80 dark:bg-stone-900/80 p-4 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <Skeleton className="h-4 w-3/5 rounded-md" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-12 rounded-md" />
                        <Skeleton className="h-3 w-14 rounded-md" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Right Column Skeleton */}
          <div className="hidden md:block md:col-span-5 lg:col-span-4 space-y-6">
            {/* Macro Distribution Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="h-32 flex items-center justify-center">
                <Skeleton className="h-28 w-28 rounded-full" />
              </div>
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/60">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-4/6 rounded-md" />
              </div>
            </div>

            {/* Quick Tips Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-3">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
