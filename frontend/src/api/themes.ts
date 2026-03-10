/**
 * React Query hooks for Theme operations.
 *
 * Query key conventions:
 *   ['themes'] — list of all themes
 *
 * ThemeContext uses these hooks internally. Components that need the theme
 * list or activation should go through ThemeContext rather than calling these
 * hooks directly, so theme state stays in one place.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { Theme } from '@/types'

export function useThemes() {
  return useQuery<Theme[]>({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data } = await client.get<Theme[]>('/api/v1/themes')
      return data
    },
  })
}

export function useActivateTheme() {
  const queryClient = useQueryClient()
  return useMutation<Theme, Error, number>({
    mutationFn: async (themeId) => {
      const { data } = await client.patch<Theme>(
        `/api/v1/themes/${themeId}/activate`,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['themes'] })
    },
  })
}
