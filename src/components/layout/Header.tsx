'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Settings, User } from 'lucide-react'
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

const HEALTH_MESSAGES = [
  'Ready to burn some calories?',
  'Fuel your body, nourish your mind.',
  'Every healthy choice counts today.',
  'Stay active, stay energized!',
  'Stay hydrated and keep moving!',
  'Small daily habits lead to big progress.',
  'Ready to crush your nutrition goals?',
  'Consistency is your superpower.',
  'Listen to your body and feel great.',
  'Make today another healthy step forward!',
]

export function Header({ userEmail, userName }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [healthMessage, setHealthMessage] = useState<string>(HEALTH_MESSAGES[0])

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * HEALTH_MESSAGES.length)
    const timer = setTimeout(() => {
      setHealthMessage(HEALTH_MESSAGES[randomIndex])
    }, 0)
    return () => clearTimeout(timer)
  }, [])

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

  // Display name fallback
  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'there')

  return (
    <header className="sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Logo & Welcome Greeting */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
          <Link
            href="/"
            aria-label="Go to Today's Dashboard"
            className="shrink-0 transition-transform active:scale-95 hover:opacity-90 cursor-pointer"
          >
            <Image
              src="/logo.svg"
              alt="Callories Logo"
              width={40}
              height={40}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-contain shadow-2xs"
              priority
            />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-stone-900 dark:text-stone-100 truncate">
              Welcome ! {displayName}
            </h1>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 truncate">
              {healthMessage}
            </p>
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
          <DropdownMenuTrigger
            aria-label="User account menu"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-600 transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
          >
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl p-2 bg-card border border-stone-200/80 dark:border-stone-800/80 shadow-2xl transition-all duration-200 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          >
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  {userName || 'User'}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  {userEmail || 'My Account'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="cursor-pointer flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Adjust Goals & Metrics
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <div className="pt-1">
              <DropdownMenuItem
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 focus:bg-red-600 text-white focus:text-white font-semibold text-xs transition-all shadow-md shadow-red-500/25 active:scale-95 cursor-pointer [&_svg]:!text-white"
              >
                <LogOut className="h-4 w-4 !text-white text-white shrink-0" /> Log Out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
