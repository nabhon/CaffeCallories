import type { QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Invalidate all entry queries and day_logs across all views (Today dashboard and Calendar).
 * This ensures that adding or deleting an entry immediately updates every view.
 */
export async function invalidateEntries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['entries'] }),
    queryClient.invalidateQueries({ queryKey: ['day_logs'] }),
  ])
}

/**
 * Invalidate day_logs queries.
 */
export async function invalidateDayLogs(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ['day_logs'],
  })
}

/**
 * Update the goal of a specific day without affecting other days or profile_settings.
 */
export async function updateDayLogGoal(
  queryClient: QueryClient,
  params: {
    userId: string
    date: string
    calorieGoal: number
    targetProteinG?: number
    targetCarbsG?: number
    targetFatG?: number
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('day_logs')
    .upsert(
      {
        user_id: params.userId,
        date: params.date,
        calorie_goal: params.calorieGoal,
        target_protein_g: params.targetProteinG ?? 150,
        target_carbs_g: params.targetCarbsG ?? 200,
        target_fat_g: params.targetFatG ?? 65,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) throw error

  await invalidateDayLogs(queryClient)
  return data
}

/**
 * Invalidate profile queries.
 */
export async function invalidateProfile(queryClient: QueryClient, userId?: string) {
  return queryClient.invalidateQueries({
    queryKey: userId ? ['profile', userId] : ['profile'],
  })
}

/**
 * Invalidate settings queries.
 */
export async function invalidateSettings(queryClient: QueryClient, userId?: string) {
  return queryClient.invalidateQueries({
    queryKey: userId ? ['settings', userId] : ['settings'],
  })
}

/**
 * Invalidate all user-specific data on logout or profile reset.
 */
export async function invalidateAllUserData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['auth'] }),
    queryClient.invalidateQueries({ queryKey: ['profile'] }),
    queryClient.invalidateQueries({ queryKey: ['settings'] }),
    queryClient.invalidateQueries({ queryKey: ['entries'] }),
    queryClient.invalidateQueries({ queryKey: ['day_logs'] }),
  ])
}
