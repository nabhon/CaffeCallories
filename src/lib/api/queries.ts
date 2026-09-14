import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DayLog, Entry, Profile, ProfileSettings } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export const queryKeys = {
  authUser: ['auth', 'user'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  settings: (userId: string) => ['settings', userId] as const,
  todayEntries: (userId: string) => ['entries', 'today', userId] as const,
  monthEntries: (userId: string, year: number, month: number) =>
    ['entries', 'month', userId, year, month] as const,
  monthDayLogs: (userId: string, year: number, month: number) =>
    ['day_logs', 'month', userId, year, month] as const,
  dayLog: (userId: string, date: string) =>
    ['day_logs', 'single', userId, date] as const,
}

// 1. Current authenticated user session
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: queryKeys.authUser,
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error || !user) return null
      return user
    },
    staleTime: 5 * 60 * 1000,
  })
}

// 2. User profile
export function useUserProfile(userId: string | null | undefined) {
  return useQuery<Profile | null>({
    queryKey: userId ? queryKeys.profile(userId) : ['profile', 'anonymous'],
    queryFn: async () => {
      if (!userId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

// 3. User calorie & macro goals settings
export function useUserSettings(userId: string | null | undefined) {
  return useQuery<ProfileSettings | null>({
    queryKey: userId ? queryKeys.settings(userId) : ['settings', 'anonymous'],
    queryFn: async () => {
      if (!userId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        console.error('Error fetching settings:', error)
        return null
      }
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

// 4. Today's entries
export function useTodayEntries(userId: string | null | undefined) {
  return useQuery<Entry[]>({
    queryKey: userId ? queryKeys.todayEntries(userId) : ['entries', 'today', 'anonymous'],
    queryFn: async () => {
      if (!userId) return []
      const supabase = createClient()
      const now = new Date()
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      ).toISOString()
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      ).toISOString()

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay)
        .order('logged_at', { ascending: false })

      if (error) {
        console.error('Error fetching today entries:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

// 5. Month's entries for Calendar
export function useMonthEntries(
  userId: string | null | undefined,
  year: number,
  month: number
) {
  return useQuery<Entry[]>({
    queryKey: userId
      ? queryKeys.monthEntries(userId, year, month)
      : ['entries', 'month', 'anonymous', year, month],
    queryFn: async () => {
      if (!userId) return []
      const supabase = createClient()
      const startOfMonth = new Date(year, month, 1, 0, 0, 0).toISOString()
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', startOfMonth)
        .lte('logged_at', endOfMonth)
        .order('logged_at', { ascending: false })

      if (error) {
        console.error('Error fetching month entries:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

// 6. Month's day_logs for Calendar
export function useMonthDayLogs(
  userId: string | null | undefined,
  year: number,
  month: number
) {
  return useQuery<DayLog[]>({
    queryKey: userId
      ? queryKeys.monthDayLogs(userId, year, month)
      : ['day_logs', 'month', 'anonymous', year, month],
    queryFn: async () => {
      if (!userId) return []
      const supabase = createClient()
      const mm = String(month + 1).padStart(2, '0')
      const startDate = `${year}-${mm}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

      const { data, error } = await supabase
        .from('day_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching month day_logs:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

// 7. Single day_log query
export function useDayLog(userId: string | null | undefined, dateStr: string) {
  return useQuery<DayLog | null>({
    queryKey: userId
      ? queryKeys.dayLog(userId, dateStr)
      : ['day_logs', 'single', 'anonymous', dateStr],
    queryFn: async () => {
      if (!userId || !dateStr) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('day_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .maybeSingle()

      if (error) {
        console.error('Error fetching day_log:', error)
        return null
      }
      return data
    },
    enabled: !!userId && !!dateStr,
    staleTime: 60 * 1000,
  })
}

