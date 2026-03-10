/**
 * useReminders — polls the backend for outstanding scheduled items.
 *
 * Runs a setInterval at VITE_REMINDER_POLL_INTERVAL seconds (default 60).
 * Returns the current list of outstanding items and a dismiss() function
 * that clears the list until the next poll fires.
 *
 * The interval is cleared on component unmount. An initial fetch runs
 * immediately on mount so users see reminders without waiting a full interval.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchOutstanding } from '@/api/reminders'
import type { ReminderItem } from '@/types'

const DEFAULT_INTERVAL_SECONDS = 60

function getPollIntervalMs(): number {
  const raw = import.meta.env.VITE_REMINDER_POLL_INTERVAL as string | undefined
  const parsed = raw !== undefined ? parseInt(raw, 10) : NaN
  const seconds = Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_INTERVAL_SECONDS
  return seconds * 1000
}

interface UseRemindersResult {
  outstanding: ReminderItem[]
  dismiss: () => void
}

export function useReminders(): UseRemindersResult {
  const [outstanding, setOutstanding] = useState<ReminderItem[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track whether the user has dismissed; reset on next poll
  const dismissedRef = useRef(false)

  const poll = useCallback(async () => {
    try {
      const items = await fetchOutstanding()
      // If dismissed, only show new items that weren't in the dismissed list
      // (simplest approach: reset dismissed flag on each poll, show all results)
      dismissedRef.current = false
      setOutstanding(items)
    } catch (err) {
      // Log but do not crash — a failed poll is not fatal
      console.error('[useReminders] Poll failed:', err)
    }
  }, [])

  const dismiss = useCallback(() => {
    dismissedRef.current = true
    setOutstanding([])
  }, [])

  useEffect(() => {
    // Fetch immediately on mount
    void poll()

    const intervalMs = getPollIntervalMs()
    intervalRef.current = setInterval(() => void poll(), intervalMs)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [poll])

  return { outstanding, dismiss }
}
