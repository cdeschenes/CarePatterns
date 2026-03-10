/**
 * Plain async function for fetching outstanding reminders.
 *
 * Not a React Query hook — the useReminders hook manages its own polling
 * interval and state directly, without going through the query cache.
 * This keeps reminder state independent from the main data cache.
 */

import client from '@/api/client'
import type { ReminderItem } from '@/types'

export async function fetchOutstanding(): Promise<ReminderItem[]> {
  const { data } = await client.get<ReminderItem[]>(
    '/api/v1/reminders/outstanding',
  )
  return data
}
