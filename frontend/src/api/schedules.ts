/**
 * React Query hooks for Schedule operations.
 *
 * Query key conventions:
 *   ['schedule', itemId] — the schedule for a single item
 *
 * All mutations invalidate ['items'] so ItemRead (which embeds the schedule)
 * stays current in the dashboard, and ['schedule', itemId] for the detail view.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@/types'

export function useSchedule(itemId: number) {
  return useQuery<Schedule>({
    queryKey: ['schedule', itemId],
    queryFn: async () => {
      const { data } = await client.get<Schedule>(
        `/api/v1/items/${itemId}/schedule`,
      )
      return data
    },
    // 404 means no schedule — treat as null rather than an error
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useCreateSchedule(itemId: number) {
  const queryClient = useQueryClient()
  return useMutation<Schedule, Error, ScheduleCreate>({
    mutationFn: async (body) => {
      const { data } = await client.post<Schedule>(
        `/api/v1/items/${itemId}/schedule`,
        body,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule', itemId] })
    },
  })
}

export function useUpdateSchedule(itemId: number) {
  const queryClient = useQueryClient()
  return useMutation<Schedule, Error, ScheduleUpdate>({
    mutationFn: async (body) => {
      const { data } = await client.patch<Schedule>(
        `/api/v1/items/${itemId}/schedule`,
        body,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule', itemId] })
    },
  })
}

export function useDeleteSchedule(itemId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await client.delete(`/api/v1/items/${itemId}/schedule`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule', itemId] })
    },
  })
}
