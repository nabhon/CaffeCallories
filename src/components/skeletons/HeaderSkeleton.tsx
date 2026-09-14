import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Logo & Welcome text skeleton */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
          <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <Skeleton className="h-4 w-32 sm:w-44 rounded-md" />
            <Skeleton className="h-3 w-24 sm:w-36 rounded-md" />
          </div>
        </div>

        {/* Desktop Nav skeleton */}
        <div className="hidden md:flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

        {/* User avatar skeleton */}
        <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0" />
      </div>
    </header>
  )
}
