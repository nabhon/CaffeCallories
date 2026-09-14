import React from 'react'
import { HeaderSkeleton } from './HeaderSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-28 md:pb-12 text-stone-900 dark:text-stone-100 flex flex-col items-center">
      <HeaderSkeleton />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Page Title & Subtitle */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form Fields */}
          <div className="md:col-span-7 space-y-6">
            {/* Biometrics Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-5">
              <div className="space-y-1.5 border-b border-stone-100 dark:border-stone-800/60 pb-3">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-3.5 w-60 rounded-md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>

            {/* Activity Level Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>

            {/* Fitness Goals Card Skeleton */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Target Card Skeleton */}
          <div className="md:col-span-5 space-y-6 md:sticky md:top-24">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 shadow-xs space-y-5">
              <Skeleton className="h-5 w-36 rounded-md" />

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>

              {/* 3 Macro splits */}
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 flex items-center justify-between"
                  >
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                  </div>
                ))}
              </div>

              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
