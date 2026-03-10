/**
 * React Query hook and download utility for the reports feature.
 *
 * useReport(filters) — fetches JSON log entries for display in the UI.
 * downloadCsv(filters) — fetches the CSV blob and triggers a browser download.
 *
 * The download uses URL.createObjectURL so the file is named
 * "carepatterns-export.csv" and does not open in a new tab.
 */

import { useQuery } from '@tanstack/react-query'
import client from '@/api/client'
import type { LogEntry, ReportFilters } from '@/types'

function buildParams(filters: ReportFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.item_id !== undefined) params.item_id = filters.item_id
  if (filters.start_date !== undefined) params.start_date = filters.start_date
  if (filters.end_date !== undefined) params.end_date = filters.end_date
  return params
}

export function useReport(filters: ReportFilters, enabled = false) {
  return useQuery<LogEntry[]>({
    queryKey: ['report', filters],
    queryFn: async () => {
      const { data } = await client.get<LogEntry[]>('/api/v1/reports', {
        params: buildParams(filters),
      })
      return data
    },
    enabled,
  })
}

export async function downloadCsv(filters: ReportFilters): Promise<void> {
  const response = await client.get<Blob>('/api/v1/reports/export', {
    params: buildParams(filters),
    responseType: 'blob',
  })

  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  anchor.download = `carepatterns-export-${date}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Release the object URL after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
