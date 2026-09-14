import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate all entry queries across all views (Today dashboard and Calendar).
 * This ensures that adding or deleting an entry immediately updates every view.
 */
export async function invalidateEntries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ['entries'],
  })
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
  ])
}
