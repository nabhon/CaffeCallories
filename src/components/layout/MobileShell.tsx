'use client'

import React from 'react'

interface MobileShellProps {
  children: React.ReactNode
}

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex justify-center selection:bg-amber-500/20 selection:text-amber-900">
      <div className="w-full max-w-md min-h-screen bg-background border-x border-stone-200/70 dark:border-stone-800/70 shadow-2xl relative flex flex-col">
        {children}
      </div>
    </div>
  )
}
