'use client'

import React from 'react'

interface MobileShellProps {
  children: React.ReactNode
}

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col selection:bg-amber-500/20 selection:text-amber-900 relative">
      {children}
    </div>
  )
}
