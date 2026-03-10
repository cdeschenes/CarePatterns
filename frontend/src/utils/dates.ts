/**
 * Date utilities for CarePatterns.
 *
 * The backend stores all datetimes as UTC-naive (no timezone suffix).
 * JavaScript's Date constructor treats strings without a timezone as local
 * time, which causes timestamps to appear hours in the future for users west
 * of UTC. parseUtcDate() appends 'Z' so the browser always interprets the
 * value as UTC.
 */

export function parseUtcDate(isoString: string): Date {
  const utc = isoString.endsWith('Z') || isoString.includes('+')
    ? isoString
    : isoString + 'Z'
  return new Date(utc)
}

export function timeAgo(isoString: string): string {
  const then = parseUtcDate(isoString).getTime()
  const diffMs = Date.now() - then

  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return parseUtcDate(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(isoString: string): string {
  return parseUtcDate(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
