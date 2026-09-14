'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Flame, Sparkles, LogOut, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  userEmail?: string | null
  userName?: string | null
}

export function Header({ userEmail, userName }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  // Initials for avatar
  const initials = userName
    ? userName.substring(0, 2).toUpperCase()
    : userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : 'CC'

  return (
    <header className="sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand & Date */}
        <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-base tracking-tight text-stone-900 dark:text-stone-100">
              Caffecallories
            </span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            {todayFormatted}
          </div>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
        <Link
          href="/"
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            pathname === '/'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Today
        </Link>
        <Link
          href="/calendar"
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            pathname.startsWith('/calendar')
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Calendar
        </Link>
      </nav>

      {/* User Avatar & Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-amber-500/50 transition-all cursor-pointer">
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                {userName || 'User'}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {userEmail || 'My Account'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push('/onboarding')}
            className="cursor-pointer flex items-center gap-2 text-xs"
          >
            <Settings className="h-3.5 w-3.5" /> Adjust Goals & Metrics
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 flex items-center gap-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
