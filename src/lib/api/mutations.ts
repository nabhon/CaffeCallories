import type { QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FoodRecommendationItem } from '@/types/database'

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
 * Quickly log a recommended food item directly into entries.
 */
export async function quickLogRecommendationEntry(
  queryClient: QueryClient,
  params: {
    userId: string
    item: FoodRecommendationItem
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: params.userId,
      name: params.item.name,
      entry_type: 'intake',
      calories: Math.abs(params.item.calories),
      protein_g: params.item.protein_g,
      carbs_g: params.item.carbs_g,
      fat_g: params.item.fat_g,
      logged_at: new Date().toISOString(),
      raw_prompt: `AI Recommendation: ${params.item.name}`,
    })
    .select()
    .single()

  if (error) throw error

  await invalidateEntries(queryClient)
  return data
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
