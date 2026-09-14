import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function OnboardingSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl space-y-6 sm:space-y-8 py-4 sm:py-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>
        </div>

        {/* 2-Column Responsive Form & Calculator */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Biometrics, Activity, Goals */}
          <div className="md:col-span-7 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-3">
              <Skeleton className="h-5 w-28 rounded-md" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Calculator card */}
          <div className="md:col-span-5 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
