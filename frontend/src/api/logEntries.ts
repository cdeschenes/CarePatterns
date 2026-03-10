/**
 * React Query hooks for LogEntry operations.
 *
 * Query key conventions:
 *   ['log-entries', itemId, page] — paginated log history for one item
 *
 * Creating a log entry invalidates both ['items'] (so the dashboard
 * re-fetches last-logged time) and ['log-entries', itemId].
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { LogEntry, LogEntryCreate } from '@/types'

export function useLogEntries(itemId: number, page: number = 1) {
  return useQuery<LogEntry[]>({
    queryKey: ['log-entries', itemId, page],
    queryFn: async () => {
      const { data } = await client.get<LogEntry[]>(
        `/api/v1/items/${itemId}/log`,
        { params: { page, per_page: 20 } },
      )
      return data
    },
  })
}

export function useCreateLogEntry(itemId: number) {
  const queryClient = useQueryClient()
  return useMutation<LogEntry, Error, LogEntryCreate>({
    mutationFn: async (body) => {
      const { data } = await client.post<LogEntry>(
        `/api/v1/items/${itemId}/log`,
        body,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['log-entries', itemId] })
    },
  })
}
